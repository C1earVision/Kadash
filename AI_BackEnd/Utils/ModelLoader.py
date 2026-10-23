import os
import re
import time
import random
import asyncio
import yaml
import httpx
from typing import Any, Optional, List
from Utils.request_context import get_cancel_scope
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatResult


def is_daily_limit_error(error: Exception) -> bool:
    """
    Detects whether an error indicates daily quota or day-limit exhaustion (TPD/RPD).
    For daily limits, sleeping for seconds is useless; the model should fail immediately
    so fallback models in the chain can take over seamlessly.
    """
    msg = str(error).lower()
    return any(
        sig in msg
        for sig in [
            "tokens per day",
            "requests per day",
            "tpd",
            "rpd",
            "day limit",
            "daily limit",
            "exceeded your current quota",
            "quota exceeded",
        ]
    )


def is_rate_limit_error(error: Exception) -> bool:
    """
    Detects whether an exception indicates a 429 or rate limit / token limit exceeded error.
    Works across Groq SDK, OpenAI SDK, httpx, and standard exceptions, including HTTP 413
    which Groq returns when a request exceeds Input Tokens Per Minute (ITPM).
    """
    status_code = getattr(error, "status_code", None)
    if status_code == 429:
        return True
    response = getattr(error, "response", None)
    if response is not None:
        resp_code = getattr(response, "status_code", None)
        if resp_code == 429:
            return True
        if resp_code == 413:
            # Groq returns 413 when ITPM is exceeded
            return True

    class_name = error.__class__.__name__.lower()
    if "ratelimit" in class_name:
        return True

    msg = str(error).lower()
    return any(
        sig in msg
        for sig in [
            "rate_limit_exceeded",
            "rate limit reached",
            "error code: 429",
            "status code 429",
            "error code: 413",
            "status code 413",
            "429 too many requests",
            "tokens per minute",
            "requests per minute",
            "input tokens per minute",
            "itpm",
            "request too large",
            "please reduce your message size",
            "please try again in",
            "try again in",
        ]
    )


def extract_retry_delay(
    error: Exception,
    attempt: int,
    default_base: float = 2.5,
    max_delay: float = 75.0,
) -> float:
    """
    Extracts the recommended retry delay from a rate limit error message or HTTP headers.
    Groq error messages explicitly state: 'Please try again in 3.2325s.'
    For tokens-per-minute (ITPM) exhaustion, Groq enforces a 60-second rolling window.
    Adds safety buffer so the window has definitely reset on the provider's side.
    Falls back to exponential backoff with jitter if no explicit delay is found.
    """
    error_str = str(error)

    # 1. Minute + second format, e.g. "1m30s" or "try again in 1m 2.5s"
    min_sec_match = re.search(
        r"try again in (\d+)\s*m\s*(\d+(?:\.\d+)?)\s*s", error_str, re.IGNORECASE
    )
    if min_sec_match:
        minutes = float(min_sec_match.group(1))
        seconds = float(min_sec_match.group(2))
        return min(max((minutes * 60.0) + seconds + 1.5, 1.0), max_delay)

    # 2. Direct time pattern, e.g. "Please try again in 3.2325s", "try again in 500ms"
    unit_match = re.search(
        r"try again in (\d+(?:\.\d+)?)\s*(ms|s|m|seconds|second)?",
        error_str,
        re.IGNORECASE,
    )
    if unit_match:
        val = float(unit_match.group(1))
        unit = (unit_match.group(2) or "s").lower()
        if unit == "ms":
            delay = val / 1000.0
        elif unit in ("m", "minute", "minutes"):
            delay = val * 60.0
        else:
            delay = val
        return min(max(delay + 1.0, 1.0), max_delay)

    # 3. Check response headers if present on the exception (httpx / requests)
    response = getattr(error, "response", None)
    if response is not None and hasattr(response, "headers"):
        headers = response.headers
        for hdr in [
            "retry-after-ms",
            "retry-after",
            "x-ratelimit-reset-tokens",
            "x-ratelimit-reset-requests",
        ]:
            if hdr in headers:
                try:
                    hdr_val = str(headers[hdr])
                    # Check for "1m30s" in header
                    ms_match = re.search(r"(\d+)\s*m\s*(\d+(?:\.\d+)?)\s*s", hdr_val, re.IGNORECASE)
                    if ms_match:
                        return min(float(ms_match.group(1)) * 60.0 + float(ms_match.group(2)) + 1.5, max_delay)
                    num_match = re.search(r"(\d+(?:\.\d+)?)", hdr_val)
                    if num_match:
                        val = float(num_match.group(1))
                        if "ms" in hdr or "ms" in hdr_val.lower():
                            val = val / 1000.0
                        return min(max(val + 1.0, 1.0), max_delay)
                except Exception:
                    pass

    # 4. Check for tokens-per-minute (ITPM) errors where Groq's 60s window applies
    lower_err = error_str.lower()
    if any(sig in lower_err for sig in [
        "input tokens per minute",
        "itpm",
        "tokens per minute",
        "request too large",
        "please reduce your message size",
    ]):
        # The rolling token window is 60 seconds — wait 62s for full reset
        print(f"[ModelLoader] ITPM rolling token window detected — applying 62s reset delay")
        return 62.0

    # 5. Exponential backoff with small random jitter
    delay = default_base * (1.5**attempt) + random.uniform(0.2, 0.6)
    return min(max(delay, 1.0), max_delay)


class ResilientChatGroq(ChatGroq):
    """
    ChatGroq with intelligent rate-limit backoff and retry.
    Instead of failing fast on rate limit spikes, this pauses for the exact duration
    requested by Groq (e.g. 'Please try again in 3.2325s' + buffer) and transparently retries.
    """

    max_rate_limit_retries: int = 5

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        attempt = 0
        while True:
            try:
                return super()._generate(
                    messages, stop=stop, run_manager=run_manager, **kwargs
                )
            except Exception as e:
                if is_daily_limit_error(e):
                    print(
                        f"[ResilientChatGroq] Daily quota reached on '{self.model_name}'. "
                        f"Failing over immediately to fallback models..."
                    )
                    raise

                if is_rate_limit_error(e) and attempt < self.max_rate_limit_retries:
                    attempt += 1
                    delay = extract_retry_delay(e, attempt)
                    if delay >= 10.0:
                        remaining = delay
                        print(
                            f"[ResilientChatGroq] Token/rate limit on '{self.model_name}' — "
                            f"waiting {delay:.1f}s for window reset (attempt {attempt}/{self.max_rate_limit_retries})..."
                        )
                        while remaining > 0:
                            chunk = min(10.0, remaining)
                            time.sleep(chunk)
                            remaining -= chunk
                            if remaining > 0:
                                print(f"[ResilientChatGroq] Cooldown: {remaining:.0f}s remaining on '{self.model_name}'...")
                    else:
                        print(
                            f"[ResilientChatGroq] Rate limit reached on '{self.model_name}'. "
                            f"Backing off for {delay:.2f}s (attempt {attempt}/{self.max_rate_limit_retries})..."
                        )
                        time.sleep(delay)
                else:
                    raise

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        attempt = 0
        while True:
            try:
                return await super()._agenerate(
                    messages, stop=stop, run_manager=run_manager, **kwargs
                )
            except Exception as e:
                if is_daily_limit_error(e):
                    print(
                        f"[ResilientChatGroq] Daily quota reached on '{self.model_name}'. "
                        f"Failing over immediately to fallback models..."
                    )
                    raise

                if is_rate_limit_error(e) and attempt < self.max_rate_limit_retries:
                    attempt += 1
                    delay = extract_retry_delay(e, attempt)
                    if delay >= 10.0:
                        remaining = delay
                        print(
                            f"[ResilientChatGroq] Token/rate limit on '{self.model_name}' — "
                            f"waiting {delay:.1f}s for window reset (attempt {attempt}/{self.max_rate_limit_retries})..."
                        )
                        while remaining > 0:
                            chunk = min(10.0, remaining)
                            await asyncio.sleep(chunk)
                            remaining -= chunk
                            if remaining > 0:
                                print(f"[ResilientChatGroq] Cooldown: {remaining:.0f}s remaining on '{self.model_name}'...")
                    else:
                        print(
                            f"[ResilientChatGroq] Rate limit reached on '{self.model_name}'. "
                            f"Backing off for {delay:.2f}s (attempt {attempt}/{self.max_rate_limit_retries})..."
                        )
                        await asyncio.sleep(delay)
                else:
                    raise


class ResilientChatOpenAI(ChatOpenAI):
    """
    ChatOpenAI with intelligent rate-limit backoff and retry.
    """

    max_rate_limit_retries: int = 5

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        attempt = 0
        while True:
            try:
                return super()._generate(
                    messages, stop=stop, run_manager=run_manager, **kwargs
                )
            except Exception as e:
                if is_daily_limit_error(e):
                    print(
                        f"[ResilientChatOpenAI] Daily quota reached on '{self.model_name}'. "
                        f"Failing over immediately to fallback models..."
                    )
                    raise

                if is_rate_limit_error(e) and attempt < self.max_rate_limit_retries:
                    attempt += 1
                    delay = extract_retry_delay(e, attempt)
                    if delay >= 10.0:
                        remaining = delay
                        print(
                            f"[ResilientChatOpenAI] Token/rate limit on '{self.model_name}' — "
                            f"waiting {delay:.1f}s for window reset (attempt {attempt}/{self.max_rate_limit_retries})..."
                        )
                        while remaining > 0:
                            chunk = min(10.0, remaining)
                            time.sleep(chunk)
                            remaining -= chunk
                            if remaining > 0:
                                print(f"[ResilientChatOpenAI] Cooldown: {remaining:.0f}s remaining on '{self.model_name}'...")
                    else:
                        print(
                            f"[ResilientChatOpenAI] Rate limit reached on '{self.model_name}'. "
                            f"Backing off for {delay:.2f}s (attempt {attempt}/{self.max_rate_limit_retries})..."
                        )
                        time.sleep(delay)
                else:
                    raise

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        attempt = 0
        while True:
            try:
                return await super()._agenerate(
                    messages, stop=stop, run_manager=run_manager, **kwargs
                )
            except Exception as e:
                if is_daily_limit_error(e):
                    print(
                        f"[ResilientChatOpenAI] Daily quota reached on '{self.model_name}'. "
                        f"Failing over immediately to fallback models..."
                    )
                    raise

                if is_rate_limit_error(e) and attempt < self.max_rate_limit_retries:
                    attempt += 1
                    delay = extract_retry_delay(e, attempt)
                    if delay >= 10.0:
                        remaining = delay
                        print(
                            f"[ResilientChatOpenAI] Token/rate limit on '{self.model_name}' — "
                            f"waiting {delay:.1f}s for window reset (attempt {attempt}/{self.max_rate_limit_retries})..."
                        )
                        while remaining > 0:
                            chunk = min(10.0, remaining)
                            await asyncio.sleep(chunk)
                            remaining -= chunk
                            if remaining > 0:
                                print(f"[ResilientChatOpenAI] Cooldown: {remaining:.0f}s remaining on '{self.model_name}'...")
                    else:
                        print(
                            f"[ResilientChatOpenAI] Rate limit reached on '{self.model_name}'. "
                            f"Backing off for {delay:.2f}s (attempt {attempt}/{self.max_rate_limit_retries})..."
                        )
                        await asyncio.sleep(delay)
                else:
                    raise


class modelLoader:
    def __init__(self, model_provider="groq", model_id=None):
        env_path = os.path.join(os.path.dirname(__file__), "../.env")
        load_dotenv(env_path)
        load_dotenv()
        self.model_provider = model_provider
        self.model_id = model_id
        self.config_path = os.path.join(
            os.path.dirname(__file__), "../Model/config.yaml"
        )
        self.models_config = self._load_config()

    def _load_config(self):
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, "r") as file:
                    data = yaml.safe_load(file)
                    return data.get("llm", {}).get("models", [])
        except Exception as e:
            print(f"Warning: Failed to load config.yaml: {e}")
        return []

    @staticmethod
    def _make_model_id(cfg):
        """Generate a stable unique ID from a model config entry."""
        return f"{cfg.get('provider', 'unknown')}:{cfg.get('model_name', 'unknown')}"

    @classmethod
    def get_available_models(cls):
        """Return the list of all configured models with their IDs for the frontend."""
        loader = cls()
        models = []
        for cfg in loader.models_config:
            models.append({
                "id": cls._make_model_id(cfg),
                "provider": cfg.get("provider", "unknown"),
                "model_name": cfg.get("model_name", "unknown"),
                "name": cfg.get("name", cfg.get("model_name", "Unknown")),
            })
        return models

    @staticmethod
    def _scoped_http_client() -> Optional[httpx.AsyncClient]:
        scope = get_cancel_scope()
        if scope is None:
            return None
        client = httpx.AsyncClient(timeout=httpx.Timeout(None, connect=30.0))
        scope.register_http_client(client)
        return client

    @staticmethod
    def _stream_chunk_timeout(provider: str) -> Optional[float]:
        """
        LangChain ChatOpenAI defaults to 120s between stream chunks; local Ollama
        models often pause longer while reasoning. Set Veyra_STREAM_CHUNK_TIMEOUT_S
        (seconds) to override, or 0/none/off to disable.
        """
        raw = os.getenv("Veyra_STREAM_CHUNK_TIMEOUT_S", "").strip()
        if raw:
            if raw.lower() in ("0", "none", "off", "disable", "false"):
                return None
            return float(raw)
        if provider == "ollama":
            return None
        return None

    def _create_model_instance(self, cfg):
        """Create a single chat model based on provider configuration with resilient rate-limit backoff."""
        provider = cfg.get("provider", "groq").lower()
        model_name = cfg.get("model_name")
        if provider == "ollama":
            http_async_client = self._scoped_http_client()
            ollama_base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
            return ResilientChatOpenAI(
                model=model_name,
                base_url=ollama_base,
                api_key="ollama",  # Ollama doesn't need a real key; OpenAI client requires a non-empty string
                temperature=0.1,
                max_retries=1,
                max_tokens=32768,
                http_async_client=http_async_client,
                stream_chunk_timeout=self._stream_chunk_timeout("ollama"),
            )

        elif provider == "groq":
            groq_key = os.getenv("GROQ_API_KEY")
            if not groq_key:
                return None
            return ResilientChatGroq(
                model=model_name,
                api_key=groq_key,
                temperature=0.1,
                max_tokens=6000,
                max_retries=1,  # Transport retries; ResilientChatGroq handles smart rate-limit backoff sleeps
            )

        elif provider == "openai":
            openai_key = os.getenv("OPENAI_API_KEY")
            if not openai_key:
                return None
            http_async_client = self._scoped_http_client()
            return ResilientChatOpenAI(
                model=model_name,
                api_key=openai_key,
                temperature=0.1,
                max_retries=1,
                max_tokens=6000,
                http_async_client=http_async_client,
                stream_chunk_timeout=self._stream_chunk_timeout("openai"),
            )

        elif provider in ("gemini", "google"):
            gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if not gemini_key:
                return None
            http_async_client = self._scoped_http_client()
            return ResilientChatOpenAI(
                model=model_name,
                api_key=gemini_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                temperature=0.1,
                max_retries=1,
                max_tokens=8192,
                http_async_client=http_async_client,
                stream_chunk_timeout=self._stream_chunk_timeout("gemini"),
            )

        return None

    def _resolve_model_configs(self):
        """
        Returns the list of model configs to use, respecting model_id selection.
        If model_id is set, the selected model is placed first; all others become fallbacks.
        """
        all_configs = self.models_config or [
            {"provider": "gemini", "model_name": "gemini-3.8-flash", "name": "Gemini 3.8 Flash (Google)"},
            {"provider": "gemini", "model_name": "gemini-3.5-flash-lite", "name": "Gemini 3.5 Flash Lite (Google)"},
            {"provider": "ollama", "model_name": "qwen3.5:4b"},
            {"provider": "groq", "model_name": "qwen/qwen3.8-27b"},
            {"provider": "groq", "model_name": "openai/gpt-oss-120b"},
            {"provider": "groq", "model_name": "openai/gpt-oss-20b"},
            {"provider": "openai", "model_name": "gpt-4o-mini"},
        ]

        if not self.model_id:
            return all_configs

        # Put the user-selected model first, then the rest as fallbacks
        selected = None
        rest = []
        for cfg in all_configs:
            if self._make_model_id(cfg) == self.model_id:
                selected = cfg
            else:
                rest.append(cfg)

        if selected:
            return [selected] + rest
        return all_configs

    def get_primary_model(self):
        """
        Returns a single BaseLanguageModel instance (required by SQLDatabaseToolkit
        which expects a raw BaseLanguageModel instance, not a RunnableWithFallbacks).
        Equipped with ResilientChatGroq/ResilientChatOpenAI rate-limit retry logic.
        """
        model_configs = self._resolve_model_configs()
        for cfg in model_configs:
            inst = self._create_model_instance(cfg)
            if inst is not None:
                return inst
        raise RuntimeError("No model could be initialized for SQLDatabaseToolkit.")

    def get_model_chain(self, tools=None):
        """
        Builds a resilient LLM chain with automatic fallbacks.
        If tools are supplied, binds the tools to every model in the fallback chain.
        Each model instance has built-in smart sleep/backoff on rate limits.
        """
        model_configs = self._resolve_model_configs()

        active_instances = []
        model_names_loaded = []

        for cfg in model_configs:
            try:
                model_inst = self._create_model_instance(cfg)
                if model_inst is not None:
                    if tools:
                        model_inst = model_inst.bind_tools(tools)
                    active_instances.append(model_inst)
                    model_names_loaded.append(
                        f"{cfg.get('model_name')} ({cfg.get('provider')})"
                    )
            except Exception as e:
                print(f"Skipping model {cfg.get('model_name')}: {e}")

        if not active_instances:
            raise RuntimeError(
                "No LLM models could be initialized. Please verify your GROQ_API_KEY or OPENAI_API_KEY in .env"
            )

        primary = active_instances[0]
        if len(active_instances) > 1:
            print(
                f"[ModelLoader] Initialized primary model [{model_names_loaded[0]}] with {len(active_instances)-1} automatic fallback(s):"
            )
            for name in model_names_loaded[1:]:
                print(f"   -> Fallback: {name}")
            return primary.with_fallbacks(active_instances[1:])

        print(f"[ModelLoader] Initialized single model: {model_names_loaded[0]}")
        return primary

    def load_llm(self):
        """Backward-compatible loader returning the resilient fallback chain without tools."""
        return self.get_model_chain(tools=None)
import os
import re
import time
import random
import asyncio
import yaml
from typing import Any, Optional, List
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatResult


def is_rate_limit_error(error: Exception) -> bool:
    """
    Detects whether an exception indicates a 429 or rate limit exceeded error.
    Works across Groq SDK, OpenAI SDK, httpx, and standard exceptions.
    """
    if getattr(error, "status_code", None) == 429:
        return True
    response = getattr(error, "response", None)
    if response is not None and getattr(response, "status_code", None) == 429:
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
            "429 too many requests",
            "tokens per minute",
            "requests per minute",
            "please try again in",
            "try again in",
        ]
    )


def extract_retry_delay(
    error: Exception,
    attempt: int,
    default_base: float = 2.5,
    max_delay: float = 45.0,
) -> float:
    """
    Extracts the recommended retry delay from a rate limit error message or HTTP headers.
    Groq error messages explicitly state: 'Please try again in 3.2325s.'
    Adds a 0.5s safety buffer so the window has definitely reset on the provider's side.
    Falls back to exponential backoff with jitter if no explicit delay is found.
    """
    error_str = str(error)

    # 1. Minute + second format, e.g. "1m30s"
    min_sec_match = re.search(
        r"try again in (\d+)\s*m\s*(\d+(?:\.\d+)?)\s*s", error_str, re.IGNORECASE
    )
    if min_sec_match:
        minutes = float(min_sec_match.group(1))
        seconds = float(min_sec_match.group(2))
        return min(max((minutes * 60.0) + seconds + 0.5, 1.0), max_delay)

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
        return min(max(delay + 0.5, 1.0), max_delay)

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
                    num_match = re.search(r"(\d+(?:\.\d+)?)", str(headers[hdr]))
                    if num_match:
                        val = float(num_match.group(1))
                        if "ms" in hdr or "ms" in str(headers[hdr]).lower():
                            val = val / 1000.0
                        return min(max(val + 0.5, 1.0), max_delay)
                except Exception:
                    pass

    # 4. Exponential backoff with small random jitter
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
                if is_rate_limit_error(e) and attempt < self.max_rate_limit_retries:
                    attempt += 1
                    delay = extract_retry_delay(e, attempt)
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
                if is_rate_limit_error(e) and attempt < self.max_rate_limit_retries:
                    attempt += 1
                    delay = extract_retry_delay(e, attempt)
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
                if is_rate_limit_error(e) and attempt < self.max_rate_limit_retries:
                    attempt += 1
                    delay = extract_retry_delay(e, attempt)
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
                if is_rate_limit_error(e) and attempt < self.max_rate_limit_retries:
                    attempt += 1
                    delay = extract_retry_delay(e, attempt)
                    print(
                        f"[ResilientChatOpenAI] Rate limit reached on '{self.model_name}'. "
                        f"Backing off for {delay:.2f}s (attempt {attempt}/{self.max_rate_limit_retries})..."
                    )
                    await asyncio.sleep(delay)
                else:
                    raise


class modelLoader:
    def __init__(self, model_provider="groq"):
        load_dotenv()
        self.model_provider = model_provider
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

    def _create_model_instance(self, cfg):
        """Create a single chat model based on provider configuration with resilient rate-limit backoff."""
        provider = cfg.get("provider", "groq").lower()
        model_name = cfg.get("model_name")

        if provider == "groq":
            groq_key = os.getenv("GROQ_API_KEY")
            if not groq_key:
                return None
            return ResilientChatGroq(
                model=model_name,
                api_key=groq_key,
                temperature=0.1,
                max_tokens=12000,
                max_retries=1,  # Transport retries; ResilientChatGroq handles smart rate-limit backoff sleeps
            )

        elif provider == "openai":
            openai_key = os.getenv("OPENAI_API_KEY")
            if not openai_key:
                return None
            return ResilientChatOpenAI(
                model=model_name,
                api_key=openai_key,
                temperature=0.1,
                max_retries=1,
                max_tokens=12000,
            )

        return None

    def get_primary_model(self):
        """
        Returns a single BaseLanguageModel instance (required by SQLDatabaseToolkit
        which expects a raw BaseLanguageModel instance, not a RunnableWithFallbacks).
        Equipped with ResilientChatGroq/ResilientChatOpenAI rate-limit retry logic.
        """
        model_configs = self.models_config or [
            {"provider": "groq", "model_name": "openai/gpt-oss-120b"},
            {"provider": "groq", "model_name": "qwen/qwen3.8-27b"},
            {"provider": "groq", "model_name": "openai/gpt-oss-20b"},
        ]
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
        model_configs = self.models_config or [
            {"provider": "groq", "model_name": "openai/gpt-oss-120b"},
            {"provider": "groq", "model_name": "qwen/qwen3.8-27b"},
            {"provider": "groq", "model_name": "openai/gpt-oss-20b"},
            {"provider": "openai", "model_name": "gpt-4o-mini"},
        ]

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
import os
import yaml
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI


class modelLoader:
    def __init__(self, model_provider="groq"):
        load_dotenv()
        self.model_provider = model_provider
        self.config_path = os.path.join(os.path.dirname(__file__), "../Model/config.yaml")
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
        """Create a single chat model based on provider configuration."""
        provider = cfg.get("provider", "groq").lower()
        model_name = cfg.get("model_name")

        if provider == "groq":
            groq_key = os.getenv("GROQ_API_KEY")
            if not groq_key:
                return None
            return ChatGroq(
                model=model_name,
                api_key=groq_key,
                temperature=0.1,
                max_retries=1,  # Fast failover to next model on rate limit
            )

        elif provider == "openai":
            openai_key = os.getenv("OPENAI_API_KEY")
            if not openai_key:
                return None
            return ChatOpenAI(
                model=model_name,
                api_key=openai_key,
                temperature=0.1,
                max_retries=1,
            )

        return None

    def get_primary_model(self):
        """
        Returns a single BaseLanguageModel instance (required by SQLDatabaseToolkit
        which expects a raw BaseLanguageModel instance, not a RunnableWithFallbacks).
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
                    model_names_loaded.append(f"{cfg.get('model_name')} ({cfg.get('provider')})")
            except Exception as e:
                print(f"Skipping model {cfg.get('model_name')}: {e}")

        if not active_instances:
            raise RuntimeError(
                "No LLM models could be initialized. Please verify your GROQ_API_KEY or OPENAI_API_KEY in .env"
            )

        primary = active_instances[0]
        if len(active_instances) > 1:
            print(f"[ModelLoader] Initialized primary model [{model_names_loaded[0]}] with {len(active_instances)-1} automatic fallback(s):")
            for name in model_names_loaded[1:]:
                print(f"   -> Fallback: {name}")
            return primary.with_fallbacks(active_instances[1:])

        print(f"[ModelLoader] Initialized single model: {model_names_loaded[0]}")
        return primary

    def load_llm(self):
        """Backward-compatible loader returning the resilient fallback chain without tools."""
        return self.get_model_chain(tools=None)
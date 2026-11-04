from app.adapters.outbound.language.fake import TemplateChat
from app.adapters.outbound.language.ollama import OllamaAgent
from app.adapters.outbound.language.tutor import TutorAgent
from app.config import Config
from app.ports.chat import ChatEngine


def chat_engine(config: Config) -> ChatEngine:
    """El motor del chat según la configuración: las plantillas sin el Servidor
    PC2 (LANGUAGE_MODEL=fake); con él, el tutor (CHAT_ENGINE=tutor) o los
    pedidos (CHAT_ENGINE=pedidos, el chat anterior, mientras se comparan). Lo
    usan la API y el banco de preguntas."""
    if config.language_model != "ollama":
        return TemplateChat()
    if config.chat_engine == "tutor":
        return TutorAgent(
            config.llm_url,
            config.llm_model,
            config.llm_api_key,
            config.llm_timeout,
            config.llm_deadline,
            config.llm_temperature,
        )
    return OllamaAgent(
        config.llm_url,
        config.llm_model,
        config.llm_api_key,
        config.llm_timeout,
        config.llm_deadline,
        write=config.llm_write,
        write_deadline=config.llm_write_deadline,
    )

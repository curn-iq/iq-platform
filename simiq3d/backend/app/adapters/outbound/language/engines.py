from app.adapters.outbound.language.fake import TemplateChat
from app.adapters.outbound.language.tutor import TutorAgent
from app.config import Config
from app.ports.chat import ChatEngine


def chat_engine(config: Config) -> ChatEngine:
    """El motor del chat según la configuración: el tutor con el modelo del
    Servidor PC2 (LANGUAGE_MODEL=ollama) o, sin él, las reglas fijas con sus
    plantillas (LANGUAGE_MODEL=fake, para desarrollar). Lo usan la API y el
    banco de preguntas."""
    if config.language_model != "ollama":
        return TemplateChat()
    return TutorAgent(
        config.llm_url,
        config.llm_model,
        config.llm_api_key,
        config.llm_timeout,
        config.llm_deadline,
        config.llm_temperature,
    )

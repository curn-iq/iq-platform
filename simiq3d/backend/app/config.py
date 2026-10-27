from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    sql_echo: bool = False
    # Pool de conexiones a la base. En Vercel va apagado (DATABASE_POOL=false):
    # cada función vive poco y no comparte conexiones, así que un pool por
    # instancia solo acumularía conexiones abiertas en Neon.
    database_pool: bool = True

    # Backend de DataIQ: de ahí salen el catálogo y la clave pública con la que
    # se validan los JWT (/.well-known/jwks.json). SIMIQ3D nunca toca su base.
    dataiq_url: str = "http://127.0.0.1:8000"
    # Lo que DataIQ pone en cada JWT; un token con otros valores no es de aquí.
    jwt_issuer: str = "dataiq"
    jwt_audience: str = "iq-platform"

    # Cookie de sesión que deja DataIQ al iniciar sesión. Por el proxy de Vercel
    # el navegador la manda también a /api/simiq3d. Secure solo se apaga para
    # probar sin https en un navegador que no lo acepte en localhost.
    session_cookie_name: str = "__Host-iq_session"
    session_cookie_secure: bool = True

    # Páginas de otro origen que pueden llamar a la API desde el navegador. Con
    # el proxy de Vercel (y el de Angular en desarrollo) todo es mismo origen y
    # va vacío. Si la API pasa a su propio subdominio, aquí va el del frontend,
    # como lista JSON: CORS_ORIGINS=["https://app.dominio.com"]
    cors_origins: list[str] = []

    # Quién elige la acción del chat: "fake" (reglas por palabras clave, para
    # desarrollar sin Ollama) u "ollama" (el modelo del Servidor PC2).
    language_model: Literal["fake", "ollama"] = "fake"
    # Dirección del filtro con clave del Servidor PC2 (Tailscale Funnel); en local,
    # Ollama directo. La clave solo la tiene este backend.
    llm_url: str = "http://127.0.0.1:11434"
    llm_model: str = "qwen3-vl:8b-instruct"
    llm_api_key: str = ""
    llm_timeout: float = 60
    # Tiempo máximo de una pregunta, sumando todos los pasos del agente.
    llm_deadline: float = 30

    # Tope de preguntas por cuenta: cuántas en cuántos segundos. Se cuenta con
    # el id de la cuenta cifrado con esta clave (HMAC), aparte del registro
    # anónimo. Sin clave no hay tope (desarrollo).
    chat_quota_secret: str = ""
    chat_quota_max: int = 30
    chat_quota_window: int = 600

    # Registro anónimo de conversaciones: solo se enciende en las sesiones de
    # evaluación y la prueba piloto, con consentimiento informado, y se borra al
    # terminar (ver el README de SIMIQ3D, «Backend y base de datos»).
    chat_log_enabled: bool = True

    @property
    def jwks_url(self) -> str:
        return f"{self.dataiq_url.rstrip('/')}/.well-known/jwks.json"


config = Config()

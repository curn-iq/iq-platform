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
    # Con Ollama, qué chat: "tutor" (el modelo conversa con los datos de DataIQ,
    # decidido por Mauricio el 2026-11-03) o "pedidos" (el anterior: el modelo
    # convierte la pregunta en pedidos y responden las plantillas). El anterior
    # queda mientras se comparan con el banco de preguntas.
    chat_engine: Literal["tutor", "pedidos"] = "tutor"
    # Qué tan variado escribe el tutor: 0 repite siempre lo mismo; 0,3 deja
    # conversar sin inventar más (a medir con el banco).
    llm_temperature: float = 0.3
    # Dirección del filtro con clave del Servidor PC2 (Tailscale Funnel); en local,
    # Ollama directo. La clave solo la tiene este backend.
    llm_url: str = "http://127.0.0.1:11434"
    llm_model: str = "qwen3-vl:8b-instruct"
    llm_api_key: str = ""
    llm_timeout: float = 60
    # Tiempo máximo de cada llamada al modelo: con los pedidos, para entender
    # la pregunta; con el tutor, para escribir la respuesta. Pasado ese tiempo,
    # el tutor responde con lo que DataIQ tiene de lo que se nombró.
    llm_deadline: float = 30
    # Con los pedidos: si el modelo redacta la respuesta con los datos de
    # DataIQ (la segunda llamada), y cuánto puede tardar: pasado ese tiempo, o
    # si el texto no pasa la verificación, se muestra la respuesta armada por
    # las plantillas.
    llm_write: bool = True
    # 20 s: una respuesta larga («dime todo sobre la mastectomía…») tardaba más de
    # 12 en producción; en el MVP se acepta esperar (decidido por Mauricio el
    # 2026-11-03).
    llm_write_deadline: float = 20

    # Tope de preguntas por cuenta: cuántas en cuántos segundos. Se cuenta con
    # el id de la cuenta cifrado con esta clave (HMAC), aparte del registro
    # anónimo. Sin clave no hay tope (desarrollo).
    chat_quota_secret: str = ""
    chat_quota_max: int = 30
    chat_quota_window: int = 600

    # Registro anónimo de conversaciones: encendido mientras dura el proyecto; al
    # cerrar la evaluación se exporta, se borra y se apaga (ver el README de
    # SIMIQ3D, «Backend y base de datos»).
    chat_log_enabled: bool = True

    @property
    def jwks_url(self) -> str:
        return f"{self.dataiq_url.rstrip('/')}/.well-known/jwks.json"


config = Config()

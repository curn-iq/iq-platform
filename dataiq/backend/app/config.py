from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    sql_echo: bool = False

    # Clave privada Ed25519 (32 bytes en base64) con la que DataIQ firma los JWT.
    # Los demás módulos solo reciben la pública, por /.well-known/jwks.json.
    jwt_private_key: str
    jwt_expiration_hours: int = 2
    jwt_issuer: str = "dataiq"
    jwt_audience: str = "iq-platform"

    # Cookie de sesión del navegador (ver api/session.py). Secure solo se apaga
    # para probar sin https en un navegador que no lo acepte en localhost.
    session_cookie_name: str = "__Host-iq_session"
    session_cookie_secure: bool = True

    # Páginas de otro origen que pueden llamar a la API desde el navegador. Con
    # el proxy de Vercel (y el de Angular en desarrollo) todo es mismo origen y
    # va vacío. Si la API pasa a su propio subdominio, aquí va el del frontend,
    # como lista JSON: CORS_ORIGINS=["https://app.dominio.com"]
    cors_origins: list[str] = []

    # Versión de la política de tratamiento de datos que acepta quien se registra
    policy_version: str = "1.0"


config = Config()

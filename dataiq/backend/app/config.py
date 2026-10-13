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

    # Páginas web que pueden llamar a la API desde el navegador (CORS). En .env
    # va como lista JSON: CORS_ORIGINS=["http://localhost:4200"]
    cors_origins: list[str] = ["http://localhost:4200"]

    # Versión de la política de tratamiento de datos que acepta quien se registra
    policy_version: str = "1.0"


config = Config()

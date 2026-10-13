from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    sql_echo: bool = False

    # Clave privada Ed25519 (32 bytes en base64) con la que DataIQ firma los JWT.
    # Los demás módulos solo reciben la pública, por /.well-known/jwks.json.
    jwt_private_key: str
    jwt_expiration_hours: int = 12
    jwt_issuer: str = "dataiq"
    jwt_audience: str = "iq-platform"

    # Versión de la política de tratamiento de datos que acepta quien se registra
    policy_version: str = "1.0"


config = Config()

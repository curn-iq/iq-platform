from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    url_base_datos: str
    sql_echo: bool = False

    # Clave privada Ed25519 (32 bytes en base64) con la que DataIQ firma los JWT.
    # Los demás módulos solo reciben la pública, por /.well-known/jwks.json.
    jwt_clave_privada: str
    jwt_duracion_horas: int = 12
    jwt_emisor: str = "dataiq"
    jwt_audiencia: str = "iq-platform"

    # Versión de la política de tratamiento de datos que acepta quien se registra
    version_politica: str = "1.0"


config = Config()

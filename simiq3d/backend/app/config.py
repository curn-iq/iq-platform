from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Backend de DataIQ: de ahí salen el catálogo y la clave pública con la que
    # se validan los JWT (/.well-known/jwks.json). SIMIQ3D nunca toca su base.
    dataiq_url: str = "http://127.0.0.1:8000"
    # Lo que DataIQ pone en cada JWT; un token con otros valores no es de aquí.
    jwt_issuer: str = "dataiq"
    jwt_audience: str = "iq-platform"


config = Config()

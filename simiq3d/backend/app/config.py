from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

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

    @property
    def jwks_url(self) -> str:
        return f"{self.dataiq_url.rstrip('/')}/.well-known/jwks.json"


config = Config()

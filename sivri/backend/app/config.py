from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    sql_echo: bool = False

    # Backend de DataIQ: de ahí salen el catálogo con las mesas y la clave pública
    # con la que se validan los JWT (/.well-known/jwks.json). SIVRI nunca toca su
    # base.
    dataiq_url: str = "http://127.0.0.1:8000"
    # Lo que DataIQ pone en cada JWT; un token con otros valores no es de aquí.
    jwt_issuer: str = "dataiq"
    jwt_audience: str = "iq-platform"

    # SIVRI corre en el Servidor PC1, en otro dominio que la página: aquí va el
    # origen del shell (lista JSON). No recibe la cookie de sesión, solo el token
    # corto en Authorization: Bearer.
    cors_origins: list[str] = []

    # Quién reconoce el instrumental: «fake» (el detector de pruebas) o «yolo»
    # (los pesos entrenados en `model_path`).
    detector: Literal["fake", "yolo"] = "fake"
    model_path: str = "models/sivri.pt"
    # Archivo JSON con las detecciones que devuelve el detector de pruebas; sin
    # él no ve nada.
    fake_detections: str = ""
    confidence: float = 0.35
    image_size: int = 640
    device: str = "cpu"

    # El cuadro se reduce a este lado mayor antes de procesarlo; el marcador y
    # el detector ven la misma imagen.
    max_image_side: int = 1280
    max_upload_bytes: int = 8_000_000

    # Puntos de partida de la validación (README de SIVRI, «Cómo se valida la
    # mesa»); se ajustan con las fotos de la sesión de validación.
    cell_margin: float = 0.10
    close_gap: float = 0.05

    # Cada cuánto se vuelve a leer de la base el mapeo clase → instrumento.
    class_map_ttl: float = 60

    # Dónde está el código fuente: la licencia (AGPL-3.0) obliga a ofrecerlo a
    # quien usa SIVRI por internet.
    source_url: str = "https://github.com/curn-iq/iq-platform/tree/main/sivri"

    @property
    def jwks_url(self) -> str:
        return f"{self.dataiq_url.rstrip('/')}/.well-known/jwks.json"


config = Config()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.api.routes import health, stream, techniques, validate
from app.config import config

app = FastAPI(
    title="SIVRI",
    description=(
        "Reconoce el instrumental quirúrgico con la cámara y valida si su "
        "disposición en la mesa de Mayo es la de la técnica elegida."
    ),
    version="0.1.0",
)


def cors_options(origins: list[str]) -> dict:
    """SIVRI corre en el Servidor PC1, en otro dominio que la página del shell: el
    navegador solo deja leer sus respuestas si la API autoriza ese origen. No hay
    cookies: el token corto viaja en Authorization."""
    return {
        "allow_origins": origins,
        "allow_credentials": False,
        "allow_methods": ["GET", "POST"],
        "allow_headers": ["Authorization", "Content-Type"],
        "max_age": 600,
    }


app.add_middleware(CORSMiddleware, **cors_options(config.cors_origins))

app.include_router(validate.router)
app.include_router(stream.router)
app.include_router(techniques.router)
app.include_router(health.router)

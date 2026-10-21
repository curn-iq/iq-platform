from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.api.routes import health
from app.adapters.inbound.api.session import CSRF_HEADER
from app.config import config

app = FastAPI(
    title="SIMIQ3D",
    description="Chat para explorar en 3D la mesa de cada técnica quirúrgica.",
    version="0.1.0",
)


def cors_options(origins: list[str]) -> dict:
    """El navegador solo deja que una página lea respuestas de otro origen si la
    API lo autoriza. Con el proxy no hay otro origen y la lista va vacía; si la
    API pasa a su propio subdominio, la cookie de sesión tiene que viajar
    (allow_credentials) y el frontend necesita mandar el encabezado CSRF."""
    return {
        "allow_origins": origins,
        "allow_credentials": True,
        "allow_methods": ["GET", "POST"],
        "allow_headers": ["Authorization", "Content-Type", CSRF_HEADER],
        "max_age": 600,
    }


app.add_middleware(CORSMiddleware, **cors_options(config.cors_origins))

app.include_router(health.router)

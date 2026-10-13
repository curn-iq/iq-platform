from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.adapters.inbound.api.routes import (
    auth,
    catalog,
    techniques,
    users,
    versions,
)
from app.config import config
from app.domain.errors import Conflict, Forbidden, InvalidContent, NotFound
from app.domain.techniques import PublishingNotAllowed, TransitionNotAllowed

app = FastAPI(
    title="DataIQ",
    description="Técnicas quirúrgicas, su instrumental y sus arreglos de mesa.",
    version="0.1.0",
)

# El navegador solo deja que una página lea respuestas de otro origen si la API
# lo autoriza. El token va en Authorization, no en cookies: sin credenciales.
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "If-None-Match"],
    expose_headers=["ETag"],
    max_age=600,
)

app.include_router(techniques.router)
app.include_router(versions.router)
app.include_router(catalog.router)
app.include_router(auth.router)
app.include_router(users.router)

# Los errores del dominio no saben de HTTP; aquí se traducen a su código.
STATUS_CODES = {
    NotFound: status.HTTP_404_NOT_FOUND,
    Forbidden: status.HTTP_403_FORBIDDEN,
    PublishingNotAllowed: status.HTTP_403_FORBIDDEN,
    Conflict: status.HTTP_409_CONFLICT,
    TransitionNotAllowed: status.HTTP_409_CONFLICT,
}


def _error_response(code: int):
    async def handle(request: Request, error: Exception) -> JSONResponse:
        return JSONResponse({"detail": str(error)}, status_code=code)

    return handle


for exception, code in STATUS_CODES.items():
    app.add_exception_handler(exception, _error_response(code))


@app.exception_handler(InvalidContent)
async def handle_invalid_content(
    request: Request, error: InvalidContent
) -> JSONResponse:
    return JSONResponse(
        {"detail": error.problems},
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
    )


# Código de PostgreSQL para «valor único repetido»
UNIQUE_VIOLATION = "23505"


@app.exception_handler(IntegrityError)
async def handle_integrity_error(request: Request, error: IntegrityError):
    """Los repositorios revisan antes de insertar, pero si dos peticiones llegan
    a la vez, ambas pasan la revisión y la segunda choca con un UNIQUE de la base.
    Eso es un conflicto (409), no un error del servidor. Cualquier otra violación
    sí es un error del código y sigue siendo 500."""
    if getattr(error.orig, "sqlstate", None) != UNIQUE_VIOLATION:
        raise error
    return JSONResponse(
        {"detail": "Otro cambio llegó primero. Recarga e intenta de nuevo."},
        status_code=status.HTTP_409_CONFLICT,
    )

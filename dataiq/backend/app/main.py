from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.adapters.inbound.api.routes import (
    auth,
    catalog,
    techniques,
    users,
    versions,
)
from app.domain.errors import Conflict, Forbidden, InvalidContent, NotFound
from app.domain.techniques import PublishingNotAllowed, TransitionNotAllowed

app = FastAPI(
    title="DataIQ",
    description="Técnicas quirúrgicas, su instrumental y sus arreglos de mesa.",
    version="0.1.0",
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

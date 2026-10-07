from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.adaptadores.entrada.api.rutas import autenticacion, tecnicas, usuarios
from app.dominio.errores import Conflicto, ContenidoInvalido, NoEncontrado, SinPermiso
from app.dominio.tecnicas import PublicacionNoPermitida, TransicionNoPermitida

app = FastAPI(
    title="DataIQ",
    description="Técnicas quirúrgicas, su instrumental y sus arreglos de mesa.",
    version="0.1.0",
)

app.include_router(tecnicas.router)
app.include_router(autenticacion.router)
app.include_router(usuarios.router)

# Los errores del dominio no saben de HTTP; aquí se traducen a su código.
CODIGOS = {
    NoEncontrado: status.HTTP_404_NOT_FOUND,
    SinPermiso: status.HTTP_403_FORBIDDEN,
    PublicacionNoPermitida: status.HTTP_403_FORBIDDEN,
    Conflicto: status.HTTP_409_CONFLICT,
    TransicionNoPermitida: status.HTTP_409_CONFLICT,
}


def _responder_error(codigo: int):
    async def manejar(request: Request, error: Exception) -> JSONResponse:
        return JSONResponse({"detail": str(error)}, status_code=codigo)

    return manejar


for excepcion, codigo in CODIGOS.items():
    app.add_exception_handler(excepcion, _responder_error(codigo))


@app.exception_handler(ContenidoInvalido)
async def manejar_contenido_invalido(
    request: Request, error: ContenidoInvalido
) -> JSONResponse:
    return JSONResponse(
        {"detail": error.problemas},
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
    )

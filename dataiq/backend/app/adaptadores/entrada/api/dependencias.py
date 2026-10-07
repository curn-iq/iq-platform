from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.adaptadores.salida.persistencia.base_datos import SesionLocal
from app.adaptadores.salida.persistencia.repositorios.tecnicas import (
    RepositorioTecnicasSQLAlchemy,
)
from app.adaptadores.salida.persistencia.repositorios.usuarios import (
    RepositorioUsuariosSQLAlchemy,
)
from app.adaptadores.salida.seguridad.contrasenas import CifradorArgon2
from app.adaptadores.salida.seguridad.tokens import EmisorJWT
from app.config import config
from app.dominio.usuarios import Cuenta
from app.puertos.seguridad import CifradorContrasenas, EmisorTokens, TokenInvalido
from app.puertos.tecnicas import RepositorioTecnicas
from app.puertos.usuarios import RepositorioUsuarios


async def obtener_sesion() -> AsyncIterator[AsyncSession]:
    async with SesionLocal() as sesion:
        yield sesion


Sesion = Annotated[AsyncSession, Depends(obtener_sesion)]


def obtener_repositorio_tecnicas(sesion: Sesion) -> RepositorioTecnicas:
    return RepositorioTecnicasSQLAlchemy(sesion)


def obtener_repositorio_usuarios(sesion: Sesion) -> RepositorioUsuarios:
    return RepositorioUsuariosSQLAlchemy(sesion)


Tecnicas = Annotated[RepositorioTecnicas, Depends(obtener_repositorio_tecnicas)]
Usuarios = Annotated[RepositorioUsuarios, Depends(obtener_repositorio_usuarios)]

# --- Seguridad -----------------------------------------------------------

_cifrador = CifradorArgon2()
_emisor = EmisorJWT(
    config.jwt_clave_privada,
    config.jwt_duracion_horas,
    config.jwt_emisor,
    config.jwt_audiencia,
)


def obtener_cifrador() -> CifradorContrasenas:
    return _cifrador


def obtener_emisor() -> EmisorTokens:
    return _emisor


Cifrador = Annotated[CifradorContrasenas, Depends(obtener_cifrador)]
Emisor = Annotated[EmisorTokens, Depends(obtener_emisor)]

# auto_error=False: sin token no falla aquí; cada ruta decide si lo exige.
_esquema_oauth = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _no_autenticado(detalle: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detalle,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def obtener_cuenta_opcional(
    token: Annotated[str | None, Depends(_esquema_oauth)],
    emisor: Emisor,
    usuarios: Usuarios,
) -> Cuenta | None:
    if token is None:
        return None
    try:
        cuenta_id = emisor.leer(token)
    except TokenInvalido as error:
        raise _no_autenticado("El token no es válido o ya venció") from error
    # El rol se lee de la base de datos, no del token: si un admin lo cambia,
    # vale desde la siguiente petición.
    cuenta = await usuarios.obtener(cuenta_id)
    if cuenta is None:
        raise _no_autenticado("La cuenta ya no existe")
    return cuenta


async def obtener_cuenta(
    cuenta: Annotated[Cuenta | None, Depends(obtener_cuenta_opcional)],
) -> Cuenta:
    if cuenta is None:
        raise _no_autenticado("Hace falta iniciar sesión")
    return cuenta


CuentaActual = Annotated[Cuenta, Depends(obtener_cuenta)]

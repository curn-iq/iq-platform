from uuid import UUID

from fastapi import APIRouter, Request, Response
from pydantic import TypeAdapter

from app.adaptadores.entrada.api.cache import responder_con_cache
from app.adaptadores.entrada.api.dependencias import CuentaActual, Usuarios
from app.adaptadores.entrada.api.esquemas import CuentaSalida, RolEntrada
from app.dominio.errores import Conflicto
from app.dominio.usuarios import RolUsuario, exigir_rol

router = APIRouter(prefix="/usuarios", tags=["Usuarios y roles"])

lista_de_cuentas = TypeAdapter(list[CuentaSalida])


@router.get("", response_model=list[CuentaSalida])
async def listar_usuarios(
    request: Request, usuarios: Usuarios, cuenta: CuentaActual
) -> Response:
    """Todas las cuentas con su rol. Solo admin."""
    exigir_rol(cuenta.rol, RolUsuario.admin)
    cuentas = await usuarios.listar()
    cuerpo = lista_de_cuentas.dump_json(
        [CuentaSalida.model_validate(c) for c in cuentas]
    )
    return responder_con_cache(request, cuerpo, max_age=0, privado=True)


@router.patch("/{usuario_id}/rol", response_model=CuentaSalida)
async def cambiar_rol(
    usuario_id: UUID, datos: RolEntrada, usuarios: Usuarios, cuenta: CuentaActual
):
    """Asigna el rol de una cuenta. Solo admin, y no sobre su propia cuenta (así
    nunca se queda la plataforma sin admin por error)."""
    exigir_rol(cuenta.rol, RolUsuario.admin)
    if usuario_id == cuenta.id:
        raise Conflicto("No puedes cambiar tu propio rol")
    return await usuarios.cambiar_rol(usuario_id, datos.rol)

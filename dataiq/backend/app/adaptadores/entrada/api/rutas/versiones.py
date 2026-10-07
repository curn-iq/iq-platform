from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Request, Response, status
from pydantic import TypeAdapter

from app.adaptadores.entrada.api.cache import responder_con_cache
from app.adaptadores.entrada.api.dependencias import CuentaActual, Versiones
from app.adaptadores.entrada.api.esquemas import (
    ContenidoEntrada,
    RechazoEntrada,
    VersionDetalleSalida,
    VersionResumenSalida,
)
from app.dominio.errores import Conflicto, NoEncontrado, SinPermiso
from app.dominio.tecnicas import (
    EN_CURSO,
    EstadoVersion,
    VersionResumen,
    validar_contenido,
    validar_publicacion,
    validar_transicion,
)
from app.dominio.usuarios import Cuenta, RolUsuario, exigir_rol, tiene_al_menos

router = APIRouter(prefix="/versiones", tags=["Versiones"])

lista_de_versiones = TypeAdapter(list[VersionResumenSalida])


async def _version(versiones: Versiones, version_id: UUID) -> VersionResumen:
    resumen = await versiones.obtener_resumen(version_id)
    if resumen is None:
        raise NoEncontrado("La versión no existe")
    return resumen


def _exigir_autor(version: VersionResumen, cuenta: Cuenta) -> None:
    exigir_rol(cuenta.rol, RolUsuario.colaborador)
    if version.creado_por != cuenta.id:
        raise SinPermiso("Solo quien creó la versión puede hacer esto")


@router.get("", response_model=list[VersionResumenSalida])
async def listar_versiones(
    request: Request,
    versiones: Versiones,
    cuenta: CuentaActual,
    estado: Annotated[list[EstadoVersion] | None, Query()] = None,
    mias: bool = False,
) -> Response:
    """Versiones por estado (por defecto, las en curso), de la más reciente a la
    más vieja. Un colaborador solo ve las suyas; un revisor ve todas, o solo las
    suyas con `mias=true`."""
    exigir_rol(cuenta.rol, RolUsuario.colaborador)
    solo_mias = mias or not tiene_al_menos(cuenta.rol, RolUsuario.revisor)
    encontradas = await versiones.listar(
        estado or EN_CURSO, creado_por=cuenta.id if solo_mias else None
    )
    cuerpo = lista_de_versiones.dump_json(
        [VersionResumenSalida.model_validate(v) for v in encontradas]
    )
    return responder_con_cache(request, cuerpo, max_age=0, privado=True)


@router.get("/{version_id}", response_model=VersionDetalleSalida)
async def obtener_version(
    request: Request, version_id: UUID, versiones: Versiones, cuenta: CuentaActual
) -> Response:
    """Una versión con todo su contenido y sus rechazos. Un colaborador solo ve
    las suyas; un revisor ve cualquiera."""
    exigir_rol(cuenta.rol, RolUsuario.colaborador)
    detalle = await versiones.obtener(version_id)
    if detalle is None:
        raise NoEncontrado("La versión no existe")
    if not tiene_al_menos(cuenta.rol, RolUsuario.revisor):
        _exigir_autor(detalle.resumen, cuenta)
    cuerpo = VersionDetalleSalida.model_validate(detalle).model_dump_json().encode()
    return responder_con_cache(request, cuerpo, max_age=0, privado=True)


@router.put("/{version_id}", response_model=VersionDetalleSalida)
async def editar_version(
    version_id: UUID,
    contenido: ContenidoEntrada,
    versiones: Versiones,
    cuenta: CuentaActual,
):
    """Reemplaza todo el contenido de un borrador propio (el editor lo manda
    completo en cada guardado)."""
    _exigir_autor(await _version(versiones, version_id), cuenta)
    nuevo = contenido.al_dominio()
    validar_contenido(nuevo)
    await versiones.reemplazar_contenido(version_id, nuevo)
    return await versiones.obtener(version_id)


async def _cambiar_estado(
    versiones: Versiones,
    version: VersionResumen,
    hacia: EstadoVersion,
    revisor: Cuenta | None = None,
) -> None:
    validar_transicion(version.estado, hacia)
    await versiones.cambiar_estado(
        version.id, version.estado, hacia, revisor.id if revisor else None
    )


@router.post("/{version_id}/enviar", status_code=status.HTTP_204_NO_CONTENT)
async def enviar_a_revision(
    version_id: UUID, versiones: Versiones, cuenta: CuentaActual
) -> None:
    """Manda un borrador propio a revisión."""
    version = await _version(versiones, version_id)
    _exigir_autor(version, cuenta)
    await _cambiar_estado(versiones, version, EstadoVersion.en_revision)


@router.post("/{version_id}/publicar", status_code=status.HTTP_204_NO_CONTENT)
async def publicar_directo(
    version_id: UUID, versiones: Versiones, cuenta: CuentaActual
) -> None:
    """Un revisor o un admin publica su propio borrador sin pasar por revisión.
    La versión publicada que hubiera pasa a reemplazada."""
    version = await _version(versiones, version_id)
    _exigir_autor(version, cuenta)
    validar_publicacion(cuenta.rol)
    if version.estado != EstadoVersion.borrador:
        raise Conflicto("Solo se publica directo un borrador")
    await _cambiar_estado(versiones, version, EstadoVersion.publicada, cuenta)


@router.post("/{version_id}/aprobar", status_code=status.HTTP_204_NO_CONTENT)
async def aprobar(version_id: UUID, versiones: Versiones, cuenta: CuentaActual) -> None:
    """Un revisor o un admin aprueba una versión en revisión y queda publicada.
    Si otro revisor ya la decidió, responde 409."""
    validar_publicacion(cuenta.rol)
    version = await _version(versiones, version_id)
    if version.estado != EstadoVersion.en_revision:
        raise Conflicto("Solo se aprueba una versión en revisión")
    await _cambiar_estado(versiones, version, EstadoVersion.publicada, cuenta)


@router.post("/{version_id}/rechazar", status_code=status.HTTP_204_NO_CONTENT)
async def rechazar(
    version_id: UUID,
    datos: RechazoEntrada,
    versiones: Versiones,
    cuenta: CuentaActual,
) -> None:
    """Un revisor o un admin devuelve una versión en revisión a borrador, con el
    motivo. Si otro revisor ya la decidió, responde 409."""
    validar_publicacion(cuenta.rol)
    version = await _version(versiones, version_id)
    validar_transicion(version.estado, EstadoVersion.borrador)
    await versiones.rechazar(version_id, cuenta.id, datos.motivo)

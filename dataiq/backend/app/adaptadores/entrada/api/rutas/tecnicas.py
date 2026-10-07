from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import TypeAdapter

from app.adaptadores.entrada.api.cache import responder_con_cache
from app.adaptadores.entrada.api.dependencias import (
    CuentaActual,
    Tecnicas,
    Versiones,
    obtener_repositorio_tecnicas,
)
from app.adaptadores.entrada.api.esquemas import (
    InstrumentalDeTecnicaSalida,
    TecnicaNuevaEntrada,
    TecnicaPublicaSalida,
    TecnicaResumenSalida,
    VersionDetalleSalida,
)
from app.dominio.errores import Conflicto, NoEncontrado
from app.dominio.tecnicas import EstadoVersion, TecnicaDetalle, validar_transicion
from app.dominio.usuarios import RolUsuario, exigir_rol
from app.puertos.tecnicas import RepositorioTecnicas

router = APIRouter(prefix="/tecnicas", tags=["Técnicas"])

lista_de_resumenes = TypeAdapter(list[TecnicaResumenSalida])


@router.get("", response_model=list[TecnicaResumenSalida])
async def listar_tecnicas(
    request: Request,
    repositorio: Annotated[RepositorioTecnicas, Depends(obtener_repositorio_tecnicas)],
) -> Response:
    """Tecnicas publicadas, ordenadas por nombre. Es publico: no pide cuenta."""
    tecnicas = await repositorio.listar_publicadas()
    cuerpo = lista_de_resumenes.dump_json(
        [TecnicaResumenSalida.model_validate(t) for t in tecnicas]
    )
    return responder_con_cache(request, cuerpo, max_age=60)


async def _publicada(tecnicas: Tecnicas, tecnica_id: UUID) -> TecnicaDetalle:
    detalle = await tecnicas.obtener_publicada(tecnica_id)
    if detalle is None:
        raise NoEncontrado("La técnica no existe o no está publicada")
    return detalle


@router.get("/{tecnica_id}", response_model=TecnicaPublicaSalida)
async def obtener_tecnica(
    request: Request, tecnica_id: UUID, tecnicas: Tecnicas
) -> Response:
    """Datos clínicos de la versión publicada. Es público: no pide cuenta."""
    detalle = await _publicada(tecnicas, tecnica_id)
    cuerpo = TecnicaPublicaSalida.model_validate(detalle).model_dump_json().encode()
    return responder_con_cache(request, cuerpo, max_age=60)


@router.get("/{tecnica_id}/instrumental", response_model=InstrumentalDeTecnicaSalida)
async def obtener_instrumental_de_tecnica(
    request: Request, tecnica_id: UUID, tecnicas: Tecnicas, cuenta: CuentaActual
) -> Response:
    """Objetos con su mesa y celdas, suturas, equipos y dispositivos. Pide cuenta."""
    detalle = await _publicada(tecnicas, tecnica_id)
    cuerpo = (
        InstrumentalDeTecnicaSalida.model_validate(detalle).model_dump_json().encode()
    )
    return responder_con_cache(request, cuerpo, max_age=60, privado=True)


@router.post(
    "",
    response_model=VersionDetalleSalida,
    status_code=status.HTTP_201_CREATED,
)
async def crear_tecnica(
    datos: TecnicaNuevaEntrada, versiones: Versiones, cuenta: CuentaActual
):
    """Crea una técnica nueva con su versión 1 vacía, en borrador. Desde colaborador."""
    exigir_rol(cuenta.rol, RolUsuario.colaborador)
    version_id = await versiones.crear_tecnica(
        datos.nombre, datos.especialidad_id, cuenta.id
    )
    return await versiones.obtener(version_id)


@router.post(
    "/{tecnica_id}/versiones",
    response_model=VersionDetalleSalida,
    status_code=status.HTTP_201_CREATED,
)
async def crear_version(tecnica_id: UUID, versiones: Versiones, cuenta: CuentaActual):
    """Empieza a editar una técnica publicada: copia la versión publicada en una
    versión nueva en borrador. Desde colaborador."""
    exigir_rol(cuenta.rol, RolUsuario.colaborador)
    version_id = await versiones.crear_desde_publicada(tecnica_id, cuenta.id)
    return await versiones.obtener(version_id)


@router.post("/{tecnica_id}/archivar", status_code=status.HTTP_204_NO_CONTENT)
async def archivar_tecnica(
    tecnica_id: UUID, versiones: Versiones, cuenta: CuentaActual
) -> None:
    """Retira la técnica: su versión publicada pasa a archivada. Desde revisor.

    No se puede mientras tenga una versión en curso (borrador o en revisión).
    """
    exigir_rol(cuenta.rol, RolUsuario.revisor)
    publicada = await versiones.obtener_publicada_de(tecnica_id)
    if publicada is None:
        raise NoEncontrado("La técnica no existe o no está publicada")
    if await versiones.tiene_version_en_curso(tecnica_id):
        raise Conflicto("La técnica tiene una versión en curso")
    validar_transicion(publicada.estado, EstadoVersion.archivada)
    await versiones.cambiar_estado(
        publicada.id, EstadoVersion.publicada, EstadoVersion.archivada
    )

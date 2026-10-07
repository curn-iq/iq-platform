from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from pydantic import TypeAdapter

from app.adaptadores.entrada.api.cache import responder_con_cache
from app.adaptadores.entrada.api.dependencias import (
    CuentaActual,
    Tecnicas,
    obtener_repositorio_tecnicas,
)
from app.adaptadores.entrada.api.esquemas import (
    InstrumentalDeTecnicaSalida,
    TecnicaPublicaSalida,
    TecnicaResumenSalida,
)
from app.dominio.errores import NoEncontrado
from app.dominio.tecnicas import TecnicaDetalle
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

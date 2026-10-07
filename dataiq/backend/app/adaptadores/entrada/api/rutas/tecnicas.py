from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from pydantic import TypeAdapter

from app.adaptadores.entrada.api.cache import responder_con_cache
from app.adaptadores.entrada.api.dependencias import obtener_repositorio_tecnicas
from app.adaptadores.entrada.api.esquemas import TecnicaResumenSalida
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

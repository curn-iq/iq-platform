from fastapi import APIRouter, Request, Response
from pydantic import TypeAdapter

from app.adaptadores.entrada.api.cache import responder_con_cache
from app.adaptadores.entrada.api.dependencias import Catalogo, CuentaActual, Tecnicas
from app.adaptadores.entrada.api.esquemas import (
    CatalogoCompletoSalida,
    InstrumentoSalida,
)

router = APIRouter(tags=["Catálogo"])

lista_de_instrumentos = TypeAdapter(list[InstrumentoSalida])


@router.get("/catalogo/completo", response_model=CatalogoCompletoSalida)
async def obtener_catalogo_completo(
    request: Request, catalogo: Catalogo, tecnicas: Tecnicas, cuenta: CuentaActual
) -> Response:
    """Todo el catálogo y todas las técnicas publicadas con su detalle, de una vez.

    Es para que SIVRI y SIMIQ3D lo pidan una vez por sesión (con el token de quien
    usa el módulo) y lo guarden mientras dure. Pide cuenta.
    """
    completo = CatalogoCompletoSalida.model_validate(
        {
            "especialidades": await catalogo.listar_especialidades(),
            "zonas": await catalogo.listar_zonas(),
            "categorias": await catalogo.listar_categorias(),
            "instrumental": await catalogo.listar_instrumental(),
            "suturas": await catalogo.listar_suturas(),
            "equipos": await catalogo.listar_equipos(),
            "dispositivos": await catalogo.listar_dispositivos(),
            "tecnicas": await tecnicas.listar_detalles_publicadas(),
        },
        from_attributes=True,
    )
    cuerpo = completo.model_dump_json().encode()
    return responder_con_cache(request, cuerpo, max_age=300, privado=True)


@router.get("/instrumental", response_model=list[InstrumentoSalida])
async def listar_instrumental(
    request: Request, catalogo: Catalogo, cuenta: CuentaActual
) -> Response:
    """Instrumental del catálogo con su categoría y sus alias. Pide cuenta."""
    instrumentos = await catalogo.listar_instrumental()
    cuerpo = lista_de_instrumentos.dump_json(
        [InstrumentoSalida.model_validate(i) for i in instrumentos]
    )
    return responder_con_cache(request, cuerpo, max_age=60, privado=True)

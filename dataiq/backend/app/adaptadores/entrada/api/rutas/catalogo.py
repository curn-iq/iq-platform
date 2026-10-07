from uuid import UUID

from fastapi import APIRouter, Request, Response, status
from pydantic import TypeAdapter

from app.adaptadores.entrada.api.cache import responder_con_cache
from app.adaptadores.entrada.api.dependencias import Catalogo, CuentaActual, Tecnicas
from app.adaptadores.entrada.api.esquemas import (
    CatalogoCompletoSalida,
    InstrumentoCambiosEntrada,
    InstrumentoNuevoEntrada,
    InstrumentoSalida,
)
from app.dominio.usuarios import RolUsuario, exigir_rol

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


@router.post(
    "/instrumental",
    response_model=InstrumentoSalida,
    status_code=status.HTTP_201_CREATED,
)
async def crear_instrumento(
    datos: InstrumentoNuevoEntrada, catalogo: Catalogo, cuenta: CuentaActual
):
    """Agrega un instrumento al catálogo. Desde revisor."""
    exigir_rol(cuenta.rol, RolUsuario.revisor)
    return await catalogo.crear_instrumento(
        datos.nombre, datos.categoria_id, datos.descripcion
    )


@router.patch("/instrumental/{instrumento_id}", response_model=InstrumentoSalida)
async def editar_instrumento(
    instrumento_id: UUID,
    datos: InstrumentoCambiosEntrada,
    catalogo: Catalogo,
    cuenta: CuentaActual,
):
    """Cambia el nombre, la categoría o la descripción. Desde revisor.

    No pasa por revisión: el cambio se ve de una vez en las técnicas publicadas
    que usan el instrumento. El instrumental no se borra.
    """
    exigir_rol(cuenta.rol, RolUsuario.revisor)
    return await catalogo.editar_instrumento(instrumento_id, datos.al_dominio())

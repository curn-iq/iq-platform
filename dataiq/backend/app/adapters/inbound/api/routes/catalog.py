from uuid import UUID

from fastapi import APIRouter, Request, Response, status
from pydantic import TypeAdapter

from app.adapters.inbound.api.cache import respond_with_cache
from app.adapters.inbound.api.dependencies import (
    CatalogRepo,
    CurrentAccount,
    TechniqueRepo,
)
from app.adapters.inbound.api.schemas import (
    FullCatalogOut,
    InstrumentCreateIn,
    InstrumentOut,
    InstrumentUpdateIn,
    ReferenceOut,
)
from app.domain.catalog import check_description
from app.domain.users import Role, require_role

router = APIRouter(tags=["Catálogo"])

instrument_list = TypeAdapter(list[InstrumentOut])
reference_list = TypeAdapter(list[ReferenceOut])


@router.get("/specialties", response_model=list[ReferenceOut])
async def list_specialties(request: Request, catalog: CatalogRepo) -> Response:
    """Las especialidades, para filtrar el catálogo y elegir la de una técnica
    nueva. Sin cuenta; cambian muy poco, por eso se guardan 5 minutos."""
    specialties = await catalog.list_specialties()
    body = reference_list.dump_json(
        [ReferenceOut.model_validate(s) for s in specialties]
    )
    return respond_with_cache(request, body, max_age=300)


@router.get("/catalog/full", response_model=FullCatalogOut)
async def get_full_catalog(
    request: Request,
    catalog: CatalogRepo,
    techniques: TechniqueRepo,
    account: CurrentAccount,
) -> Response:
    """Todo el catálogo y todas las técnicas publicadas con su detalle, de una vez.

    Es para que SIVRI y SIMIQ3D lo pidan una vez por sesión (con el token de quien
    usa el módulo) y lo guarden mientras dure. Pide cuenta.
    """
    full_catalog = FullCatalogOut.model_validate(
        {
            "specialties": await catalog.list_specialties(),
            "zones": await catalog.list_zones(),
            "categories": await catalog.list_categories(),
            "instruments": await catalog.list_instruments(),
            "sutures": await catalog.list_sutures(),
            "equipment": await catalog.list_equipment(),
            "devices": await catalog.list_devices(),
            "techniques": await techniques.list_published_details(),
        },
        from_attributes=True,
    )
    body = full_catalog.model_dump_json().encode()
    return respond_with_cache(request, body, max_age=300, private=True)


@router.get("/instruments", response_model=list[InstrumentOut])
async def list_instruments(
    request: Request, catalog: CatalogRepo, account: CurrentAccount
) -> Response:
    """Instrumental del catálogo con su categoría y sus alias. Pide cuenta."""
    instruments = await catalog.list_instruments()
    body = instrument_list.dump_json(
        [InstrumentOut.model_validate(i) for i in instruments]
    )
    return respond_with_cache(request, body, max_age=60, private=True)


@router.post(
    "/instruments",
    response_model=InstrumentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_instrument(
    data: InstrumentCreateIn, catalog: CatalogRepo, account: CurrentAccount
):
    """Agrega un instrumento al catálogo. Desde revisor. Si trae descripción,
    trae también su fuente."""
    require_role(account.role, Role.reviewer)
    check_description(data.description, data.description_source)
    return await catalog.create_instrument(
        data.name, data.category_id, data.description, data.description_source
    )


@router.patch("/instruments/{instrument_id}", response_model=InstrumentOut)
async def update_instrument(
    instrument_id: UUID,
    data: InstrumentUpdateIn,
    catalog: CatalogRepo,
    account: CurrentAccount,
):
    """Cambia el nombre, la categoría, la descripción o los alias (la lista que
    se manda reemplaza la anterior). Desde revisor. Una descripción nueva va con
    su fuente.

    No pasa por revisión: el cambio se ve de una vez en las técnicas publicadas
    que usan el instrumento. El instrumental no se borra.
    """
    require_role(account.role, Role.reviewer)
    check_description(data.description, data.description_source)
    return await catalog.update_instrument(instrument_id, data.to_domain())

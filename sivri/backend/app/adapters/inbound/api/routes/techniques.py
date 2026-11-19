from fastapi import APIRouter, HTTPException, status

from app.adapters.inbound.api.dependencies import Catalogs, ClassMaps, CurrentCaller
from app.adapters.inbound.api.schemas import TechniqueOut, technique_out
from app.ports.catalog import CatalogDenied, CatalogUnavailable

router = APIRouter(tags=["Mesas"])


@router.get("/techniques", response_model=list[TechniqueOut])
async def list_techniques(
    caller: CurrentCaller, catalogs: Catalogs, class_maps: ClassMaps
) -> list[TechniqueOut]:
    """Las técnicas cuya mesa de Mayo valida SIVRI, según DataIQ."""
    try:
        catalog = await catalogs.get(caller.token)
    except CatalogDenied as error:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "DataIQ no aceptó el token"
        ) from error
    except CatalogUnavailable as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "DataIQ no responde"
        ) from error
    classes = await class_maps.get()
    return [technique_out(t, classes) for t in catalog.techniques]

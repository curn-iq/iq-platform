import asyncio
from uuid import UUID

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.adapters.inbound.api.dependencies import (
    Analyzer,
    Catalogs,
    ClassMaps,
    CurrentCaller,
)
from app.adapters.inbound.api.schemas import FrameOut, frame_out
from app.application.analysis import InvalidImage, UnknownTechnique
from app.config import config
from app.ports.catalog import CatalogDenied, CatalogUnavailable

router = APIRouter(tags=["Validación"])


@router.post("/validate", response_model=FrameOut)
async def validate(
    image: UploadFile,
    caller: CurrentCaller,
    catalogs: Catalogs,
    class_maps: ClassMaps,
    analyzer: Analyzer,
    technique_id: UUID | None = None,
) -> FrameOut:
    """Valida un cuadro (JPEG o PNG, desde arriba y con los cuatro marcadores).

    Con `technique_id` compara la mesa con esa técnica; sin él, reconoce de cuál de
    las cinco es. Las imágenes se procesan y no se guardan. Para el video de la
    cámara, `/ws/validate` hace lo mismo cuadro por cuadro."""
    data = await image.read(config.max_upload_bytes + 1)
    if len(data) > config.max_upload_bytes:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE, "La imagen es demasiado grande"
        )
    try:
        frame = analyzer.decode(data)
    except InvalidImage as error:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)
        ) from error
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
    try:
        analysis = await asyncio.to_thread(
            analyzer.analyze, frame, catalog, classes, technique_id
        )
    except UnknownTechnique as error:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "SIVRI no valida esa técnica"
        ) from error
    return frame_out(analysis, classes)

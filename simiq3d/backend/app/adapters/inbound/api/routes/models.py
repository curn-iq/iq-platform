from fastapi import APIRouter, Request, Response
from pydantic import TypeAdapter

from app.adapters.inbound.api.cache import respond_with_cache
from app.adapters.inbound.api.dependencies import CurrentCaller, ModelRepo
from app.adapters.inbound.api.schemas import ModelFileOut

router = APIRouter(tags=["Modelos 3D"])

model_list = TypeAdapter(list[ModelFileOut])


@router.get("/models", response_model=list[ModelFileOut])
async def list_models(
    request: Request, caller: CurrentCaller, models: ModelRepo
) -> Response:
    """Qué modelo 3D dibuja cada instrumento de DataIQ. El visor descarga el GLB
    del frontend; si un instrumento no tiene modelo, no aparece aquí."""
    files = await models.list_all()
    body = model_list.dump_json([ModelFileOut.model_validate(f) for f in files])
    return respond_with_cache(request, body, max_age=300, private=True)

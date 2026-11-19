from fastapi import APIRouter

from app.adapters.inbound.api.schemas import HealthOut
from app.config import config

router = APIRouter(tags=["Estado"])


@router.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    """Dice que SIVRI está en pie y dónde está su código fuente (AGPL-3.0)."""
    return HealthOut(status="ok", source=config.source_url)

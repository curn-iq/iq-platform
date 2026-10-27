from fastapi import APIRouter, Response

router = APIRouter(tags=["Estado"])


@router.get("/health")
async def get_health(response: Response) -> dict[str, str]:
    """Responde si la API está arriba. No mira la base ni el modelo de lenguaje."""
    # Siempre la respuesta del momento, nunca una guardada.
    response.headers["Cache-Control"] = "no-store"
    return {"status": "ok"}

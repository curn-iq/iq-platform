from fastapi import FastAPI

from app.adapters.inbound.api.routes import health

app = FastAPI(
    title="SIMIQ3D",
    description="Chat para explorar en 3D la mesa de cada técnica quirúrgica.",
    version="0.1.0",
)

app.include_router(health.router)

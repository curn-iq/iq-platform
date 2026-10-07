from fastapi import FastAPI

from app.adaptadores.entrada.api.rutas import tecnicas

app = FastAPI(
    title="DataIQ",
    description="Técnicas quirúrgicas, su instrumental y sus arreglos de mesa.",
    version="0.1.0",
)

app.include_router(tecnicas.router)

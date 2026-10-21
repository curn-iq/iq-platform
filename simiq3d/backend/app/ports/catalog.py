from typing import Protocol

from app.domain.catalog import Catalog


class CatalogSource(Protocol):
    async def get(self, token: str) -> Catalog:
        """El catálogo de DataIQ, pedido con el token de quien pregunta. Lanza
        CatalogUnavailable si DataIQ no responde y CatalogDenied si no acepta
        el token."""
        ...


class CatalogUnavailable(Exception):
    pass


class CatalogDenied(Exception):
    """DataIQ rechazó el token (p. ej. la cuenta ya no existe)."""

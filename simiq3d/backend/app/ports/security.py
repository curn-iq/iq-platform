from typing import Protocol
from uuid import UUID


class TokenVerifier(Protocol):
    async def verify(self, token: str) -> UUID:
        """Devuelve el id de la cuenta; lanza InvalidToken si no sirve y
        KeysUnavailable si no se pudo conseguir la clave para revisarlo."""
        ...


class InvalidToken(Exception):
    pass


class KeysUnavailable(Exception):
    """DataIQ no entregó su clave pública: no hay cómo saber si el token sirve."""

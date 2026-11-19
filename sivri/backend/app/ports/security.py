from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID


@dataclass(frozen=True)
class Principal:
    """Quien usa SIVRI, según su token de DataIQ."""

    account_id: UUID
    # Cuándo vence el token: el corto que entrega DataIQ dura pocos minutos y la
    # página lo renueva, así que una conexión larga tiene que renovarlo.
    expires_at: datetime


class TokenVerifier(Protocol):
    async def verify(self, token: str) -> Principal:
        """Quién es; lanza InvalidToken si el token no sirve y KeysUnavailable si
        no se pudo conseguir la clave para revisarlo."""
        ...


class InvalidToken(Exception):
    pass


class KeysUnavailable(Exception):
    """DataIQ no entregó su clave pública: no hay cómo saber si el token sirve."""

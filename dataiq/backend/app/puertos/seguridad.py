from typing import Protocol
from uuid import UUID

from app.dominio.usuarios import Cuenta


class CifradorContrasenas(Protocol):
    def cifrar(self, contrasena: str) -> str: ...

    def verificar(self, password_hash: str, contrasena: str) -> bool: ...


class EmisorTokens(Protocol):
    def emitir(self, cuenta: Cuenta) -> str: ...

    def leer(self, token: str) -> UUID:
        """Devuelve el id de la cuenta; lanza TokenInvalido si no sirve."""
        ...

    def jwks(self) -> dict: ...


class TokenInvalido(Exception):
    pass

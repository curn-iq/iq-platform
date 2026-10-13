from typing import Protocol
from uuid import UUID

from app.domain.users import Account


class PasswordService(Protocol):
    def hash_password(self, password: str) -> str: ...

    def verify_password(self, password_hash: str, password: str) -> bool: ...


class TokenIssuer(Protocol):
    def issue_token(self, account: Account) -> str: ...

    def read_token(self, token: str) -> UUID:
        """Devuelve el id de la cuenta; lanza TokenInvalido si no sirve."""
        ...

    def jwks(self) -> dict: ...


class InvalidToken(Exception):
    pass

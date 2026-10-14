from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError


class Argon2PasswordHasher:
    """Argon2id con los parámetros por defecto de argon2-cffi (RFC 9106)."""

    def __init__(self) -> None:
        self._hasher = PasswordHasher()

    def hash_password(self, password: str) -> str:
        return self._hasher.hash(password)

    def verify_password(self, password_hash: str, password: str) -> bool:
        try:
            return self._hasher.verify(password_hash, password)
        except VerificationError, InvalidHashError:
            # InvalidHashError: cuentas sin contraseña, como la de la carga
            # inicial ("!"), nunca inician sesión.
            return False

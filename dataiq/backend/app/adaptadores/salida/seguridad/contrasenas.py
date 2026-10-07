from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError


class CifradorArgon2:
    """Argon2id con los parámetros por defecto de argon2-cffi (RFC 9106)."""

    def __init__(self) -> None:
        self._hasher = PasswordHasher()

    def cifrar(self, contrasena: str) -> str:
        return self._hasher.hash(contrasena)

    def verificar(self, password_hash: str, contrasena: str) -> bool:
        try:
            return self._hasher.verify(password_hash, contrasena)
        except VerificationError, InvalidHashError:
            # InvalidHashError: cuentas sin contraseña, como la de la carga
            # inicial ("!"), nunca inician sesión.
            return False

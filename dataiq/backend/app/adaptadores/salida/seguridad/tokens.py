import base64
import hashlib
import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from app.dominio.usuarios import Cuenta
from app.puertos.seguridad import TokenInvalido


def _base64url(datos: bytes) -> str:
    return base64.urlsafe_b64encode(datos).rstrip(b"=").decode()


class EmisorJWT:
    """Firma con EdDSA (Ed25519). Solo DataIQ tiene la clave privada; SIVRI y
    SIMIQ3D validan con la pública que publica /.well-known/jwks.json."""

    algoritmo = "EdDSA"

    def __init__(
        self, clave_privada: str, duracion_horas: int, emisor: str, audiencia: str
    ) -> None:
        self._privada = Ed25519PrivateKey.from_private_bytes(
            base64.b64decode(clave_privada)
        )
        self._publica = self._privada.public_key()
        self._duracion = timedelta(hours=duracion_horas)
        self._emisor = emisor
        self._audiencia = audiencia
        x = _base64url(self._publica.public_bytes(Encoding.Raw, PublicFormat.Raw))
        # kid = huella de la clave (RFC 7638): cambia si se cambia la clave.
        huella = json.dumps(
            {"crv": "Ed25519", "kty": "OKP", "x": x}, separators=(",", ":")
        )
        self._kid = _base64url(hashlib.sha256(huella.encode()).digest())
        self._jwk = {
            "kty": "OKP",
            "crv": "Ed25519",
            "x": x,
            "kid": self._kid,
            "alg": self.algoritmo,
            "use": "sig",
        }

    def emitir(self, cuenta: Cuenta) -> str:
        ahora = datetime.now(UTC)
        datos = {
            "sub": str(cuenta.id),
            "rol": cuenta.rol.value,
            "iss": self._emisor,
            "aud": self._audiencia,
            "iat": ahora,
            "exp": ahora + self._duracion,
        }
        return jwt.encode(
            datos, self._privada, algorithm=self.algoritmo, headers={"kid": self._kid}
        )

    def leer(self, token: str) -> UUID:
        try:
            datos = jwt.decode(
                token,
                self._publica,
                algorithms=[self.algoritmo],
                audience=self._audiencia,
                issuer=self._emisor,
                options={"require": ["sub", "exp", "iat"]},
            )
            return UUID(datos["sub"])
        except (jwt.InvalidTokenError, ValueError) as error:
            raise TokenInvalido(str(error)) from error

    def jwks(self) -> dict:
        return {"keys": [self._jwk]}

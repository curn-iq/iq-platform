import base64
import hashlib
import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from app.domain.users import Account
from app.ports.security import InvalidToken


def _base64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


class JWTIssuer:
    """Firma con EdDSA (Ed25519). Solo DataIQ tiene la clave privada; SIVRI y
    SIMIQ3D validan con la pública que publica /.well-known/jwks.json."""

    algorithm = "EdDSA"

    def __init__(
        self, private_key: str, expiration_hours: int, issuer: str, audience: str
    ) -> None:
        self._private_key = Ed25519PrivateKey.from_private_bytes(
            base64.b64decode(private_key)
        )
        self._public_key = self._private_key.public_key()
        self._duration = timedelta(hours=expiration_hours)
        self._issuer = issuer
        self._audience = audience
        x = _base64url(self._public_key.public_bytes(Encoding.Raw, PublicFormat.Raw))
        # kid = huella de la clave (RFC 7638): cambia si se cambia la clave.
        thumbprint = json.dumps(
            {"crv": "Ed25519", "kty": "OKP", "x": x}, separators=(",", ":")
        )
        self._kid = _base64url(hashlib.sha256(thumbprint.encode()).digest())
        self._jwk = {
            "kty": "OKP",
            "crv": "Ed25519",
            "x": x,
            "kid": self._kid,
            "alg": self.algorithm,
            "use": "sig",
        }

    def issue_token(self, account: Account) -> str:
        now_ = datetime.now(UTC)
        data = {
            "sub": str(account.id),
            "role": account.role.value,
            "iss": self._issuer,
            "aud": self._audience,
            "iat": now_,
            "exp": now_ + self._duration,
        }
        return jwt.encode(
            data,
            self._private_key,
            algorithm=self.algorithm,
            headers={"kid": self._kid},
        )

    def read_token(self, token: str) -> UUID:
        try:
            data = jwt.decode(
                token,
                self._public_key,
                algorithms=[self.algorithm],
                audience=self._audience,
                issuer=self._issuer,
                options={"require": ["sub", "exp", "iat"]},
            )
            return UUID(data["sub"])
        except (jwt.InvalidTokenError, ValueError) as error:
            raise InvalidToken(str(error)) from error

    def jwks(self) -> dict:
        return {"keys": [self._jwk]}

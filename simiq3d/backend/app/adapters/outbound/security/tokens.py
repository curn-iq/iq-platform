import asyncio
import time
from uuid import UUID

import httpx
import jwt

from app.ports.security import InvalidToken, KeysUnavailable


class JWKSVerifier:
    """Valida los JWT de DataIQ solo con su clave pública (JWKS).

    SIMIQ3D no tiene la clave privada ni una tabla de usuarios: si la firma es
    de DataIQ, el token no venció y es para el ecosistema, quien lo trae tiene
    cuenta. Las claves se guardan en memoria por su kid; un kid desconocido
    obliga a pedirlas de nuevo (DataIQ cambió de clave), pero no más de una vez
    por minuto, para que tokens inventados no sirvan para inundar a DataIQ.
    """

    algorithm = "EdDSA"

    def __init__(
        self,
        jwks_url: str,
        issuer: str,
        audience: str,
        max_age: float = 3600,
        min_interval: float = 60,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._jwks_url = jwks_url
        self._issuer = issuer
        self._audience = audience
        self._max_age = max_age
        self._min_interval = min_interval
        self._transport = transport
        self._keys: dict[str, jwt.PyJWK] = {}
        # Última vez que se obtuvieron las claves y último intento de pedirlas
        self._fetched_at: float | None = None
        self._attempted_at: float | None = None
        self._lock = asyncio.Lock()

    async def verify(self, token: str) -> UUID:
        try:
            kid = jwt.get_unverified_header(token).get("kid")
        except jwt.InvalidTokenError as error:
            raise InvalidToken(str(error)) from error
        key = await self._key(kid)
        try:
            data = jwt.decode(
                token,
                key.key,
                # Solo EdDSA: un token firmado con otro algoritmo no se acepta
                # aunque traiga un kid conocido.
                algorithms=[self.algorithm],
                audience=self._audience,
                issuer=self._issuer,
                options={"require": ["sub", "exp", "iat"]},
            )
            return UUID(data["sub"])
        except (jwt.InvalidTokenError, ValueError) as error:
            raise InvalidToken(str(error)) from error

    async def _key(self, kid: str | None) -> jwt.PyJWK:
        if kid is None:
            raise InvalidToken("El token no dice con qué clave se firmó")
        async with self._lock:
            if (kid not in self._keys or self._stale()) and self._may_fetch():
                await self._fetch()
        if kid not in self._keys:
            raise InvalidToken("El token no está firmado con una clave de DataIQ")
        return self._keys[kid]

    def _stale(self) -> bool:
        return (
            self._fetched_at is None
            or time.monotonic() - self._fetched_at > self._max_age
        )

    def _may_fetch(self) -> bool:
        # Sin ninguna clave siempre se intenta: no hay otra forma de validar.
        return (
            not self._keys
            or self._attempted_at is None
            or time.monotonic() - self._attempted_at > self._min_interval
        )

    async def _fetch(self) -> None:
        self._attempted_at = time.monotonic()
        try:
            async with httpx.AsyncClient(
                transport=self._transport, timeout=5
            ) as client:
                response = await client.get(self._jwks_url)
                response.raise_for_status()
                keys = response.json()["keys"]
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as error:
            if self._keys:
                # Con las claves de antes se sigue validando mientras DataIQ
                # vuelve; se intenta de nuevo pasado el intervalo mínimo.
                return
            raise KeysUnavailable(str(error)) from error
        self._keys = {
            k["kid"]: jwt.PyJWK(k)
            for k in keys
            if k.get("kid") and k.get("alg") == self.algorithm
        }
        self._fetched_at = time.monotonic()

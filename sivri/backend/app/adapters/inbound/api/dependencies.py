import asyncio
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.adapters.outbound.dataiq.catalog import DataIQCatalogSource
from app.adapters.outbound.persistence.database import SessionLocal
from app.adapters.outbound.persistence.repositories.classes import (
    SQLAlchemyClassRepository,
)
from app.adapters.outbound.security.tokens import JWKSVerifier
from app.adapters.outbound.vision.aruco import ArucoMarkerFinder
from app.adapters.outbound.vision.factory import make_detector
from app.application.analysis import FrameAnalyzer
from app.config import config
from app.domain.classes import ClassMap
from app.domain.validation import ValidationSettings
from app.ports.catalog import CatalogSource
from app.ports.security import InvalidToken, KeysUnavailable, Principal, TokenVerifier

# --- Quién usa SIVRI -----------------------------------------------------------

_verifier = JWKSVerifier(config.jwks_url, config.jwt_issuer, config.jwt_audience)


def get_verifier() -> TokenVerifier:
    return _verifier


Verifier = Annotated[TokenVerifier, Depends(get_verifier)]

# auto_error=False: sin token no falla aquí, sino en get_caller, con el mensaje y el
# código de este módulo. En /docs, «Authorize» pide un token: en local, el de
# POST /auth/token de DataIQ.
_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Caller:
    """Quien hace la petición. El token se guarda para pedirle a DataIQ, a su
    nombre, el catálogo."""

    principal: Principal
    token: str


def unauthenticated(detail: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"}
    )


async def authenticate(verifier: TokenVerifier, token: str) -> Caller:
    try:
        principal = await verifier.verify(token)
    except InvalidToken as error:
        raise unauthenticated("El token no es válido o ya venció") from error
    except KeysUnavailable as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "No se pudo revisar la sesión: DataIQ no responde",
        ) from error
    return Caller(principal, token)


async def get_caller(
    bearer: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    verifier: Verifier,
) -> Caller:
    # SIVRI está en otro dominio: la cookie de sesión no llega, solo el token
    # corto de DataIQ en Authorization.
    if bearer is None:
        raise unauthenticated("Hace falta iniciar sesión")
    return await authenticate(verifier, bearer.credentials)


CurrentCaller = Annotated[Caller, Depends(get_caller)]

# --- Catálogo de DataIQ --------------------------------------------------------

_catalog_source = DataIQCatalogSource(config.dataiq_url)


def get_catalog_source() -> CatalogSource:
    return _catalog_source


Catalogs = Annotated[CatalogSource, Depends(get_catalog_source)]

# --- Mapeo clase → instrumento -------------------------------------------------


class ClassMapProvider:
    """El mapeo de la base, guardado en memoria unos segundos: cada cuadro lo
    necesita y la base no cambia entre uno y otro."""

    def __init__(self, ttl: float) -> None:
        self._ttl = ttl
        self._classes = ClassMap()
        self._loaded_at: float | None = None
        self._lock = asyncio.Lock()

    async def get(self) -> ClassMap:
        async with self._lock:
            if (
                self._loaded_at is None
                or time.monotonic() - self._loaded_at > self._ttl
            ):
                async with SessionLocal() as session:
                    entries = await SQLAlchemyClassRepository(session).list_all()
                self._classes = ClassMap(entries)
                self._loaded_at = time.monotonic()
            return self._classes


_class_map_provider = ClassMapProvider(config.class_map_ttl)


def get_class_map_provider() -> ClassMapProvider:
    return _class_map_provider


ClassMaps = Annotated[ClassMapProvider, Depends(get_class_map_provider)]

# --- Visión ----------------------------------------------------------------------


@lru_cache
def _analyzer() -> FrameAnalyzer:
    # El modelo se carga la primera vez que se usa, no al importar.
    return FrameAnalyzer(
        make_detector(config),
        ArucoMarkerFinder(),
        ValidationSettings(config.cell_margin, config.close_gap),
        config.max_image_side,
    )


def get_analyzer() -> FrameAnalyzer:
    return _analyzer()


Analyzer = Annotated[FrameAnalyzer, Depends(get_analyzer)]

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.session import session_token
from app.adapters.outbound.dataiq.catalog import DataIQCatalogSource
from app.adapters.outbound.language.fake import TemplateChat
from app.adapters.outbound.language.ollama import OllamaAgent
from app.adapters.outbound.persistence.database import SessionLocal
from app.adapters.outbound.persistence.repositories.chat_log import (
    SQLAlchemyChatLogRepository,
)
from app.adapters.outbound.persistence.repositories.mappings import (
    SQLAlchemyModelMappingRepository,
)
from app.adapters.outbound.security.tokens import JWKSVerifier
from app.config import config
from app.ports.catalog import CatalogSource
from app.ports.chat import ChatEngine
from app.ports.chat_log import ChatLogRepository
from app.ports.models3d import ModelMappingRepository
from app.ports.security import InvalidToken, KeysUnavailable, TokenVerifier

_verifier = JWKSVerifier(config.jwks_url, config.jwt_issuer, config.jwt_audience)


def get_verifier() -> TokenVerifier:
    return _verifier


Verifier = Annotated[TokenVerifier, Depends(get_verifier)]

# auto_error=False: sin token no falla aquí, sino en get_caller, con el mensaje
# y el código de este módulo. En /docs, «Authorize» pide un token de
# POST /auth/token de DataIQ.
_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Caller:
    """Quien hace la petición. El token se guarda para pedirle a DataIQ, a su
    nombre, lo que solo ve quien tiene cuenta (el catálogo)."""

    account_id: UUID
    token: str


def _unauthenticated(detail: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_caller(
    request: Request,
    bearer: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    verifier: Verifier,
) -> Caller:
    # Primero Authorization (Swagger, servidores, apps); si no, la cookie del
    # navegador.
    token = bearer.credentials if bearer else session_token(request)
    if token is None:
        raise _unauthenticated("Hace falta iniciar sesión")
    try:
        account_id = await verifier.verify(token)
    except InvalidToken as error:
        raise _unauthenticated("El token no es válido o ya venció") from error
    except KeysUnavailable as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "No se pudo revisar la sesión: DataIQ no responde",
        ) from error
    return Caller(account_id, token)


CurrentCaller = Annotated[Caller, Depends(get_caller)]


# --- Catálogo de DataIQ ----------------------------------------------------

_catalog_source = DataIQCatalogSource(config.dataiq_url)


def get_catalog_source() -> CatalogSource:
    return _catalog_source


Catalogs = Annotated[CatalogSource, Depends(get_catalog_source)]


# --- Motor del chat ---------------------------------------------------------

_chat_engine: ChatEngine = (
    OllamaAgent(
        config.llm_url, config.llm_model, config.llm_api_key, config.llm_timeout
    )
    if config.language_model == "ollama"
    else TemplateChat()
)


def get_chat_engine() -> ChatEngine:
    return _chat_engine


Engine = Annotated[ChatEngine, Depends(get_chat_engine)]


# --- Base de datos ---------------------------------------------------------


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


DbSession = Annotated[AsyncSession, Depends(get_session)]


def get_model_repository(session: DbSession) -> ModelMappingRepository:
    return SQLAlchemyModelMappingRepository(session)


ModelRepo = Annotated[ModelMappingRepository, Depends(get_model_repository)]


def get_chat_log(session: DbSession) -> ChatLogRepository | None:
    """El registro, solo si está encendido (CHAT_LOG_ENABLED)."""
    return SQLAlchemyChatLogRepository(session) if config.chat_log_enabled else None


ChatLog = Annotated[ChatLogRepository | None, Depends(get_chat_log)]

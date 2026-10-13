from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.database import SessionLocal
from app.adapters.outbound.persistence.repositories.catalog import (
    SQLAlchemyCatalogRepository,
)
from app.adapters.outbound.persistence.repositories.techniques import (
    SQLAlchemyTechniqueRepository,
)
from app.adapters.outbound.persistence.repositories.users import (
    SQLAlchemyUserRepository,
)
from app.adapters.outbound.persistence.repositories.versions import (
    SQLAlchemyVersionRepository,
)
from app.adapters.outbound.security.passwords import Argon2PasswordHasher
from app.adapters.outbound.security.tokens import JWTIssuer
from app.config import config
from app.domain.users import Account
from app.ports.catalog import CatalogRepository
from app.ports.security import InvalidToken, PasswordService, TokenIssuer
from app.ports.techniques import TechniqueRepository, VersionRepository
from app.ports.users import UserRepository


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


DbSession = Annotated[AsyncSession, Depends(get_session)]


def get_technique_repository(session: DbSession) -> TechniqueRepository:
    return SQLAlchemyTechniqueRepository(session)


def get_version_repository(session: DbSession) -> VersionRepository:
    return SQLAlchemyVersionRepository(session)


def get_catalog_repository(session: DbSession) -> CatalogRepository:
    return SQLAlchemyCatalogRepository(session)


def get_user_repository(session: DbSession) -> UserRepository:
    return SQLAlchemyUserRepository(session)


TechniqueRepo = Annotated[TechniqueRepository, Depends(get_technique_repository)]
VersionRepo = Annotated[VersionRepository, Depends(get_version_repository)]
CatalogRepo = Annotated[CatalogRepository, Depends(get_catalog_repository)]
UserRepo = Annotated[UserRepository, Depends(get_user_repository)]

# --- Seguridad -----------------------------------------------------------

_hasher = Argon2PasswordHasher()
_issuer = JWTIssuer(
    config.jwt_private_key,
    config.jwt_expiration_hours,
    config.jwt_issuer,
    config.jwt_audience,
)


def get_hasher() -> PasswordService:
    return _hasher


def get_issuer() -> TokenIssuer:
    return _issuer


Hasher = Annotated[PasswordService, Depends(get_hasher)]
Issuer = Annotated[TokenIssuer, Depends(get_issuer)]

# auto_error=False: sin token no falla aquí; cada ruta decide si lo exige.
_oauth_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _unauthenticated(detail: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_optional_account(
    token: Annotated[str | None, Depends(_oauth_scheme)],
    issuer: Issuer,
    users: UserRepo,
) -> Account | None:
    if token is None:
        return None
    try:
        account_id = issuer.read_token(token)
    except InvalidToken as error:
        raise _unauthenticated("El token no es válido o ya venció") from error
    # El rol se lee de la base de datos, no del token: si un admin lo cambia,
    # vale desde la siguiente petición.
    account = await users.get(account_id)
    if account is None:
        raise _unauthenticated("La cuenta ya no existe")
    return account


async def get_current_account(
    account: Annotated[Account | None, Depends(get_optional_account)],
) -> Account:
    if account is None:
        raise _unauthenticated("Hace falta iniciar sesión")
    return account


CurrentAccount = Annotated[Account, Depends(get_current_account)]

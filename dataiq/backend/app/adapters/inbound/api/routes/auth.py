import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.adapters.inbound.api.cache import respond_with_cache
from app.adapters.inbound.api.dependencies import (
    CurrentAccount,
    Hasher,
    Issuer,
    UserRepo,
)
from app.adapters.inbound.api.schemas import (
    AccountOut,
    RegisterIn,
    TokenOut,
)
from app.config import config

router = APIRouter(tags=["Cuenta"])

# Si el correo no existe se verifica igual contra este hash, para que la
# respuesta tarde lo mismo y no delate qué correos tienen cuenta.
_dummy_hash: str | None = None


@router.post(
    "/auth/register", response_model=AccountOut, status_code=status.HTTP_201_CREATED
)
async def register(data: RegisterIn, users: UserRepo, hasher: Hasher):
    """Autorregistro libre: la cuenta nace con el rol usuario."""
    if not data.accepts_policy:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Hay que aceptar la política de tratamiento de datos",
        )
    return await users.create(
        data.name,
        data.email.lower(),
        hasher.hash_password(data.password),
        config.policy_version,
    )


@router.post("/auth/login", response_model=TokenOut)
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    users: UserRepo,
    hasher: Hasher,
    issuer: Issuer,
):
    """Recibe el correo (en `username`) y la contraseña; devuelve el JWT."""
    global _dummy_hash
    found = await users.get_with_hash(form.username.strip().lower())
    if found is None:
        _dummy_hash = _dummy_hash or hasher.hash_password("relleno")
        hasher.verify_password(_dummy_hash, form.password)
    elif hasher.verify_password(found[1], form.password):
        return TokenOut(access_token=issuer.issue_token(found[0]))
    raise HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Correo o contraseña incorrectos",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.get("/auth/me", response_model=AccountOut)
async def get_me(request: Request, account: CurrentAccount) -> Response:
    """La cuenta de quien hace la petición."""
    body = AccountOut.model_validate(account).model_dump_json().encode()
    return respond_with_cache(request, body, max_age=0, private=True)


@router.get("/.well-known/jwks.json")
async def get_jwks(request: Request, issuer: Issuer) -> Response:
    """Clave pública con la que SIVRI y SIMIQ3D validan los JWT de DataIQ."""
    body = json.dumps(issuer.jwks()).encode()
    return respond_with_cache(request, body, max_age=3600)

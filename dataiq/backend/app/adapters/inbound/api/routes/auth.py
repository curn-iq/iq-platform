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
    LoginIn,
    RegisterIn,
    TokenOut,
)
from app.adapters.inbound.api.session import (
    clear_session_cookie,
    require_csrf_header,
    set_session_cookie,
)
from app.config import config
from app.domain.users import Account
from app.ports.security import PasswordService
from app.ports.users import UserRepository

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


async def _authenticate(
    email: str, password: str, users: UserRepository, hasher: PasswordService
) -> Account:
    global _dummy_hash
    found = await users.get_with_hash(email.strip().lower())
    if found is None:
        _dummy_hash = _dummy_hash or hasher.hash_password("relleno")
        hasher.verify_password(_dummy_hash, password)
    elif hasher.verify_password(found[1], password):
        return found[0]
    raise HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Correo o contraseña incorrectos",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post(
    "/auth/login",
    response_model=AccountOut,
    dependencies=[Depends(require_csrf_header)],
)
async def login(
    data: LoginIn,
    response: Response,
    users: UserRepo,
    hasher: Hasher,
    issuer: Issuer,
):
    """Inicio de sesión del navegador: deja el JWT en una cookie HttpOnly y
    devuelve la cuenta. El token no va en la respuesta, así JavaScript nunca lo
    tiene. Pide el encabezado X-IQ-Client."""
    account = await _authenticate(data.email, data.password, users, hasher)
    set_session_cookie(response, issuer.issue_token(account))
    return account


@router.post("/auth/token", response_model=TokenOut)
async def issue_token(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    users: UserRepo,
    hasher: Hasher,
    issuer: Issuer,
):
    """Para lo que no es navegador (Swagger, pruebas, servidores, apps): recibe
    el correo (en `username`) y la contraseña y devuelve el JWT, que se manda en
    Authorization: Bearer."""
    account = await _authenticate(form.username, form.password, users, hasher)
    return TokenOut(access_token=issuer.issue_token(account))


@router.post(
    "/auth/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf_header)],
)
async def logout(response: Response) -> None:
    """Borra la cookie de sesión del navegador."""
    clear_session_cookie(response)


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

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.adaptadores.entrada.api.cache import responder_con_cache
from app.adaptadores.entrada.api.dependencias import (
    Cifrador,
    CuentaActual,
    Emisor,
    Usuarios,
)
from app.adaptadores.entrada.api.esquemas import (
    CuentaSalida,
    RegistroEntrada,
    TokenSalida,
)
from app.config import config

router = APIRouter(tags=["Cuenta"])

# Si el correo no existe se verifica igual contra este hash, para que la
# respuesta tarde lo mismo y no delate qué correos tienen cuenta.
_hash_de_relleno: str | None = None


@router.post(
    "/auth/registro", response_model=CuentaSalida, status_code=status.HTTP_201_CREATED
)
async def registrarse(datos: RegistroEntrada, usuarios: Usuarios, cifrador: Cifrador):
    """Autorregistro libre: la cuenta nace con el rol usuario."""
    if not datos.acepta_politica:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Hay que aceptar la política de tratamiento de datos",
        )
    return await usuarios.crear(
        datos.nombre,
        datos.email.lower(),
        cifrador.cifrar(datos.contrasena),
        config.version_politica,
    )


@router.post("/auth/login", response_model=TokenSalida)
async def iniciar_sesion(
    formulario: Annotated[OAuth2PasswordRequestForm, Depends()],
    usuarios: Usuarios,
    cifrador: Cifrador,
    emisor: Emisor,
):
    """Recibe el correo (en `username`) y la contraseña; devuelve el JWT."""
    global _hash_de_relleno
    encontrada = await usuarios.obtener_con_hash(formulario.username.strip().lower())
    if encontrada is None:
        _hash_de_relleno = _hash_de_relleno or cifrador.cifrar("relleno")
        cifrador.verificar(_hash_de_relleno, formulario.password)
    elif cifrador.verificar(encontrada[1], formulario.password):
        return TokenSalida(access_token=emisor.emitir(encontrada[0]))
    raise HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Correo o contraseña incorrectos",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.get("/auth/yo", response_model=CuentaSalida)
async def obtener_mi_cuenta(request: Request, cuenta: CuentaActual) -> Response:
    """La cuenta de quien hace la petición."""
    cuerpo = CuentaSalida.model_validate(cuenta).model_dump_json().encode()
    return responder_con_cache(request, cuerpo, max_age=0, privado=True)


@router.get("/.well-known/jwks.json")
async def obtener_jwks(request: Request, emisor: Emisor) -> Response:
    """Clave pública con la que SIVRI y SIMIQ3D validan los JWT de DataIQ."""
    cuerpo = json.dumps(emisor.jwks()).encode()
    return responder_con_cache(request, cuerpo, max_age=3600)

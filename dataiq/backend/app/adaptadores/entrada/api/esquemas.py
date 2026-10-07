from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.dominio.usuarios import RolUsuario

Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class Salida(BaseModel):
    """Base de las respuestas: se arman directo desde los dataclasses del dominio."""

    model_config = ConfigDict(from_attributes=True)


class TecnicaResumenSalida(Salida):
    id: UUID
    nombre: str
    especialidad: str
    numero_version: int


# --- Cuentas -------------------------------------------------------------


class CuentaSalida(Salida):
    id: UUID
    nombre: str
    email: str
    rol: RolUsuario


class RegistroEntrada(BaseModel):
    nombre: Texto
    email: EmailStr
    # OWASP: mínimo 8 caracteres y sin tope corto
    contrasena: str = Field(min_length=8, max_length=128)
    acepta_politica: bool = Field(
        description="Autorización de tratamiento de datos (Decreto 1377 de 2013)"
    )


class TokenSalida(BaseModel):
    # Nombres fijos de OAuth2: así funciona el botón «Authorize» de /docs.
    access_token: str
    token_type: str = "bearer"


class RolEntrada(BaseModel):
    rol: RolUsuario

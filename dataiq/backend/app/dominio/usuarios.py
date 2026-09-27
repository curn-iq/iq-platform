from enum import StrEnum


class RolUsuario(StrEnum):
    usuario = "usuario"
    colaborador = "colaborador"
    revisor = "revisor"
    admin = "admin"

from enum import StrEnum


class EstadoVersion(StrEnum):
    borrador = "borrador"
    en_revision = "en_revision"
    publicada = "publicada"
    reemplazada = "reemplazada"
    archivada = "archivada"

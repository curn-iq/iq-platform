"""Integridad de los pesos del detector.

Los pesos (`.pt`) los carga PyTorch con `pickle`: un archivo cambiado ejecuta
código dentro del proceso de SIVRI. No se descargan ni los puede escribir una
cuenta, pero la huella SHA-256 (`MODEL_SHA256`) hace que un archivo cambiado, por
error o a propósito, impida arrancar en lugar de cargarse.
"""

import hashlib
import hmac
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class WeightsMismatch(Exception):
    pass


def sha256_of(path: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def verify_weights(path: str | Path, expected: str | None) -> None:
    """Sin `expected` solo avisa; con él, exige que la huella coincida."""
    if not expected:
        logger.warning(
            "MODEL_SHA256 no está definida: no se verifica la integridad de %s", path
        )
        return
    actual = sha256_of(path)
    if not hmac.compare_digest(actual, expected.strip().lower()):
        raise WeightsMismatch(
            f"Los pesos {path} no coinciden con MODEL_SHA256 (calculada: {actual})"
        )

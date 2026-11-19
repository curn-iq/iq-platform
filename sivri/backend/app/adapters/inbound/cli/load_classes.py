"""Carga el mapeo de las clases del modelo a la base de SIVRI.

    uv run python -m app.adapters.inbound.cli.load_classes [--archivo ruta]

Lee `sivri/backend/classes.csv`: la columna `clase` (el nombre del instrumento en
DataIQ, o uno de sus alias) y la columna `indice` (el número de la clase al
entrenar el modelo). Traduce cada nombre al id que tiene en el DataIQ de este
entorno (`DATAIQ_URL`): los ids cambian de una instalación a otra. Si un nombre no
existe en DataIQ, no carga nada y dice cuál. Si todo cuadra, deja la tabla igual al
archivo.

El nombre de cada clase del modelo tiene que ser el de la columna `clase`: así el
modelo entrenado y esta tabla hablan de lo mismo.

Para leer el instrumental hace falta una cuenta de DataIQ: el token va en
`DATAIQ_TOKEN`, o se piden el correo y la contraseña.
"""

import argparse
import asyncio
import csv
import getpass
import os
import sys
from pathlib import Path

import httpx

from app.adapters.outbound.persistence.database import SessionLocal
from app.adapters.outbound.persistence.repositories.classes import (
    SQLAlchemyClassRepository,
)
from app.config import config
from app.domain.catalog import normalize
from app.domain.classes import ClassEntry

# sivri/backend/classes.csv
DEFAULT_FILE = Path(__file__).resolve().parents[4] / "classes.csv"


class MappingError(Exception):
    pass


def read_rows(path: Path) -> list[str]:
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if "clase" not in (reader.fieldnames or []):
            raise MappingError("Al archivo le falta la columna: clase")
        return [row["clase"].strip() for row in reader if (row["clase"] or "").strip()]


def resolve(names: list[str], instruments: list[dict]) -> list[ClassEntry]:
    """Traduce cada nombre (o alias) al id de DataIQ. Falla con todos los nombres que
    no encuentra, no solo con el primero. La clase queda con el nombre del
    instrumento en DataIQ, que es el que lleva el modelo."""
    by_name = {
        normalize(name): (i["id"], i["name"])
        for i in instruments
        for name in (i["name"], *i.get("aliases", []))
    }
    unknown = [n for n in names if normalize(n) not in by_name]
    if unknown:
        raise MappingError("No están en DataIQ: " + "; ".join(unknown))
    entries = [
        ClassEntry(by_name[normalize(n)][1], by_name[normalize(n)][0]) for n in names
    ]
    ids = [e.instrument_id for e in entries]
    repeated = sorted({e.label for e in entries if ids.count(e.instrument_id) > 1})
    if repeated:
        raise MappingError("Instrumentos repetidos: " + "; ".join(repeated))
    return entries


async def get_token(base_url: str, email: str, password: str, transport=None) -> str:
    async with httpx.AsyncClient(
        base_url=base_url, transport=transport, timeout=30
    ) as c:
        response = await c.post(
            "/auth/token", data={"username": email, "password": password}
        )
    if response.status_code != 200:
        raise MappingError("DataIQ no aceptó el correo o la contraseña")
    return response.json()["access_token"]


async def fetch_instruments(base_url: str, token: str, transport=None) -> list[dict]:
    async with httpx.AsyncClient(
        base_url=base_url, transport=transport, timeout=30
    ) as c:
        response = await c.get(
            "/instruments", headers={"Authorization": f"Bearer {token}"}
        )
    if response.status_code != 200:
        raise MappingError(
            f"DataIQ respondió {response.status_code} al pedir el instrumental"
        )
    return response.json()


async def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Carga el mapeo de clases.")
    parser.add_argument(
        "--archivo", dest="path", metavar="ARCHIVO", type=Path, default=DEFAULT_FILE
    )
    args = parser.parse_args(argv)
    try:
        names = read_rows(args.path)
        token = os.environ.get("DATAIQ_TOKEN") or await get_token(
            config.dataiq_url,
            input("Correo de DataIQ: "),
            getpass.getpass("Contraseña: "),
        )
        entries = resolve(names, await fetch_instruments(config.dataiq_url, token))
    except (MappingError, OSError, httpx.HTTPError) as error:
        print(f"No se cargó nada. {error}", file=sys.stderr)
        return 1
    async with SessionLocal() as session:
        await SQLAlchemyClassRepository(session).replace_all(entries)
    print(f"Listo: {len(entries)} clases cargadas desde {args.path}.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

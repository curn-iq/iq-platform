"""Carga el mapeo de modelos 3D a la base de SIMIQ3D.

    uv run python -m app.adapters.inbound.cli.load_models [--archivo ruta]

Lee `simiq3d/models/modelos.csv`: la columna `instrumento` (el nombre del
instrumento en DataIQ, o uno de sus alias) y la columna `archivo` (su GLB); las
demás columnas (medidas, fuentes) son de quien modela y aquí se ignoran.
Traduce cada nombre al id que tiene en el DataIQ de este entorno (`DATAIQ_URL`):
los ids cambian de una instalación a otra. Si un nombre no existe en DataIQ, no
carga nada y dice cuál. Si todo cuadra, deja la tabla igual al archivo.

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
from app.adapters.outbound.persistence.repositories.mappings import (
    SQLAlchemyModelMappingRepository,
)
from app.config import config
from app.domain.catalog import normalize
from app.domain.models3d import ModelFile

# simiq3d/models/modelos.csv, junto a los GLB
DEFAULT_FILE = Path(__file__).resolve().parents[5] / "models" / "modelos.csv"


class MappingError(Exception):
    pass


def read_rows(path: Path) -> list[tuple[str, str]]:
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        missing = {"instrumento", "archivo"} - set(reader.fieldnames or [])
        if missing:
            raise MappingError(
                f"Al archivo le faltan las columnas: {', '.join(missing)}"
            )
        return [
            (row["instrumento"].strip(), row["archivo"].strip())
            for row in reader
            if (row["instrumento"] or "").strip()
        ]


def resolve(rows: list[tuple[str, str]], instruments: list[dict]) -> list[ModelFile]:
    """Traduce cada nombre (o alias) al id de DataIQ. Falla con todos los nombres
    que no encuentra, no solo con el primero."""
    by_name = {
        normalize(name): i["id"]
        for i in instruments
        for name in (i["name"], *i.get("aliases", []))
    }
    unknown = [name for name, _ in rows if normalize(name) not in by_name]
    if unknown:
        raise MappingError("No están en DataIQ: " + "; ".join(unknown))
    files = [ModelFile(by_name[normalize(name)], file) for name, file in rows]
    repeated = {
        f.instrument_id
        for f in files
        if [g.instrument_id for g in files].count(f.instrument_id) > 1
    }
    if repeated:
        names = sorted(
            {name for name, _ in rows if by_name[normalize(name)] in repeated}
        )
        raise MappingError("Instrumentos con más de un modelo: " + "; ".join(names))
    return files


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
    parser = argparse.ArgumentParser(description="Carga el mapeo de modelos 3D.")
    parser.add_argument("--archivo", type=Path, default=DEFAULT_FILE)
    args = parser.parse_args(argv)
    try:
        rows = read_rows(args.archivo)
        token = os.environ.get("DATAIQ_TOKEN") or await get_token(
            config.dataiq_url,
            input("Correo de DataIQ: "),
            getpass.getpass("Contraseña: "),
        )
        files = resolve(rows, await fetch_instruments(config.dataiq_url, token))
    except (MappingError, OSError, httpx.HTTPError) as error:
        print(f"No se cargó nada. {error}", file=sys.stderr)
        return 1
    async with SessionLocal() as session:
        await SQLAlchemyModelMappingRepository(session).replace_all(files)
    print(f"Listo: {len(files)} modelos cargados desde {args.archivo}.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

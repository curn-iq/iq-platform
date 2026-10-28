"""El registro de conversaciones, para la evaluación del chat.

    uv run python -m app.adapters.inbound.cli.chat_log exportar registro.csv
    uv run python -m app.adapters.inbound.cli.chat_log exportar sesion.csv \
        --desde 2026-11-02T14:30 --hasta 2026-11-02T17:00
    uv run python -m app.adapters.inbound.cli.chat_log borrar

`exportar` lo deja en un CSV para analizarlo (exactitud contra el banco de
preguntas, tiempo de respuesta), con la fecha y hora de cada pregunta. Con
--desde y --hasta (hora de Colombia), solo una sesión de evaluación; una fecha
sin hora en --hasta incluye ese día completo. `borrar` lo elimina por completo
al cerrar la evaluación; pide confirmación.
"""

import argparse
import asyncio
import csv
import sys
from dataclasses import asdict, fields
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from app.adapters.outbound.persistence.database import SessionLocal
from app.adapters.outbound.persistence.repositories.chat_log import (
    SQLAlchemyChatLogRepository,
)
from app.domain.chat_log import ChatLogEntry

# Las sesiones de evaluación son en la CURN: las horas se escriben en hora local
COLOMBIA = ZoneInfo("America/Bogota")


def parse_moment(value: str, end: bool = False) -> datetime:
    """«2026-11-02T14:30» o «2026-11-02», en hora de Colombia. Una fecha sola es
    el comienzo de ese día; como final (end), el comienzo del siguiente, para
    que el día entre completo."""
    try:
        moment = datetime.fromisoformat(value)
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"«{value}» no es una fecha; se escribe AAAA-MM-DD o AAAA-MM-DDTHH:MM"
        ) from None
    if end and "T" not in value and " " not in value:
        moment = datetime.combine(date.fromisoformat(value) + timedelta(days=1), time())
    return moment if moment.tzinfo else moment.replace(tzinfo=COLOMBIA)


def write_csv(entries: list[ChatLogEntry], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[x.name for x in fields(ChatLogEntry)])
        writer.writeheader()
        for entry in entries:
            row = asdict(entry)
            writer.writerow({k: _cell(v) for k, v in row.items()})


def _cell(value) -> str:
    """Vacío si no hay dato; la fecha, en hora de Colombia."""
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.astimezone(COLOMBIA).isoformat(timespec="seconds")
    return str(value)


async def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Registro de conversaciones.")
    sub = parser.add_subparsers(dest="command", required=True)
    exportar = sub.add_parser("exportar", help="Guardarlo en un CSV")
    exportar.add_argument("path", metavar="archivo", type=Path)
    exportar.add_argument(
        "--desde", dest="since", type=parse_moment, help="Desde esta fecha y hora"
    )
    exportar.add_argument(
        "--hasta",
        dest="until",
        type=lambda v: parse_moment(v, end=True),
        help="Hasta esta fecha y hora, sin incluirla",
    )
    borrar = sub.add_parser("borrar", help="Borrarlo todo")
    borrar.add_argument(
        "--si", dest="yes", action="store_true", help="No pedir confirmación"
    )
    args = parser.parse_args(argv)

    async with SessionLocal() as session:
        repository = SQLAlchemyChatLogRepository(session)
        if args.command == "exportar":
            entries = await repository.list_all(args.since, args.until)
            write_csv(entries, args.path)
            print(f"{len(entries)} conversaciones en {args.path}.")
            return 0
        if (
            not args.yes
            and input("¿Borrar todo el registro? Escribe «borrar»: ") != "borrar"
        ):
            print("No se borró nada.")
            return 1
        print(f"Registro borrado: {await repository.delete_all()} conversaciones.")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

"""El registro de conversaciones, para la evaluación del chat.

    uv run python -m app.adapters.inbound.cli.chat_log exportar registro.csv
    uv run python -m app.adapters.inbound.cli.chat_log borrar

`exportar` lo deja en un CSV para analizarlo (exactitud contra el banco de
preguntas, tiempo de respuesta). `borrar` lo elimina por completo al terminar la
evaluación, como se le promete a los participantes; pide confirmación.
"""

import argparse
import asyncio
import csv
import sys
from dataclasses import asdict, fields
from pathlib import Path

from app.adapters.outbound.persistence.database import SessionLocal
from app.adapters.outbound.persistence.repositories.chat_log import (
    SQLAlchemyChatLogRepository,
)
from app.domain.chat_log import ChatLogEntry


def write_csv(entries: list[ChatLogEntry], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[x.name for x in fields(ChatLogEntry)])
        writer.writeheader()
        for entry in entries:
            row = asdict(entry)
            writer.writerow({k: "" if v is None else str(v) for k, v in row.items()})


async def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Registro de conversaciones.")
    sub = parser.add_subparsers(dest="orden", required=True)
    exportar = sub.add_parser("exportar", help="Guardarlo en un CSV")
    exportar.add_argument("archivo", type=Path)
    borrar = sub.add_parser("borrar", help="Borrarlo todo")
    borrar.add_argument("--si", action="store_true", help="No pedir confirmación")
    args = parser.parse_args(argv)

    async with SessionLocal() as session:
        repository = SQLAlchemyChatLogRepository(session)
        if args.orden == "exportar":
            entries = await repository.list_all()
            write_csv(entries, args.archivo)
            print(f"{len(entries)} conversaciones en {args.archivo}.")
            return 0
        if (
            not args.si
            and input("¿Borrar todo el registro? Escribe «borrar»: ") != "borrar"
        ):
            print("No se borró nada.")
            return 1
        print(f"Registro borrado: {await repository.delete_all()} conversaciones.")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

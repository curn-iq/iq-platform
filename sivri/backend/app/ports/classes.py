from typing import Protocol

from app.domain.classes import ClassEntry


class ClassRepository(Protocol):
    async def list_all(self) -> list[ClassEntry]: ...

    async def replace_all(self, entries: list[ClassEntry]) -> None:
        """Deja la tabla igual a esta lista (lo que no está, se borra)."""
        ...

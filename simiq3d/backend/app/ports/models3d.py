from typing import Protocol

from app.domain.models3d import ModelFile


class ModelMappingRepository(Protocol):
    async def list_all(self) -> list[ModelFile]: ...

    async def replace_all(self, files: list[ModelFile]) -> None:
        """Deja la tabla igual a esta lista (lo que no está, se borra)."""
        ...

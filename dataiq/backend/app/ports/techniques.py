from collections.abc import Iterable
from typing import Protocol
from uuid import UUID

from app.domain.techniques import (
    TechniqueDetail,
    TechniqueSummary,
    VersionContent,
    VersionDetail,
    VersionState,
    VersionSummary,
)


class TechniqueRepository(Protocol):
    async def list_published(self) -> list[TechniqueSummary]: ...

    async def get_published(self, technique_id: UUID) -> TechniqueDetail | None: ...

    async def list_published_details(self) -> list[TechniqueDetail]: ...


class VersionRepository(Protocol):
    async def list_all(
        self, states: Iterable[VersionState], created_by: UUID | None = None
    ) -> list[VersionSummary]: ...

    async def get_summary(self, version_id: UUID) -> VersionSummary | None: ...

    async def get(self, version_id: UUID) -> VersionDetail | None: ...

    async def get_published_of(self, technique_id: UUID) -> VersionSummary | None: ...

    async def has_version_in_progress(self, technique_id: UUID) -> bool: ...

    async def create_technique(
        self, name: str, specialty_id: UUID, author_id: UUID
    ) -> UUID: ...

    async def create_from_published(
        self, technique_id: UUID, author_id: UUID
    ) -> UUID: ...

    async def replace_content(
        self, version_id: UUID, content: VersionContent
    ) -> None: ...

    async def change_state(
        self,
        version_id: UUID,
        from_state: VersionState,
        to_state: VersionState,
        reviewer_id: UUID | None = None,
    ) -> None: ...

    async def reject(
        self, version_id: UUID, reviewer_id: UUID, reason: str
    ) -> None: ...

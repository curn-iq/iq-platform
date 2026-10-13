from collections.abc import Iterable
from uuid import UUID

from sqlalchemy import delete, exists, func, insert, literal, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.models.catalog import (
    BiomedicalEquipment,
    Instrument,
    MedicalDevice,
    Suture,
)
from app.adapters.outbound.persistence.models.techniques import (
    ItemCell,
    ItemComponent,
    Specialty,
    Technique,
    TechniqueItem,
    TechniqueVersion,
    VersionDevice,
    VersionEquipment,
    VersionRejection,
    VersionSuture,
    VersionZone,
    Zone,
)
from app.adapters.outbound.persistence.models.users import User
from app.adapters.outbound.persistence.repositories.techniques import build_details
from app.domain.errors import Conflict, InvalidContent, NotFound
from app.domain.techniques import (
    IN_PROGRESS,
    Rejection,
    VersionContent,
    VersionDetail,
    VersionState,
    VersionSummary,
)

CLINICAL_FIELDS = (
    "cups_code",
    "anesthesia",
    "patient_position",
    "drapes",
    "description",
    "indications",
    "complications",
    "surgical_technique",
    "source",
)


class SQLAlchemyVersionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # --- Lectura ---------------------------------------------------------

    def _summary_query(self):
        return (
            select(
                TechniqueVersion.id,
                TechniqueVersion.technique_id,
                Technique.name.label("technique"),
                Specialty.name.label("specialty"),
                TechniqueVersion.number,
                TechniqueVersion.state,
                TechniqueVersion.created_by,
                User.name.label("author"),
                TechniqueVersion.updated_at,
            )
            .join(Technique, Technique.id == TechniqueVersion.technique_id)
            .join(Specialty, Specialty.id == Technique.specialty_id)
            .join(User, User.id == TechniqueVersion.created_by)
        )

    async def list_all(
        self,
        states: Iterable[VersionState],
        created_by: UUID | None = None,
        reviewed_by: UUID | None = None,
    ) -> list[VersionSummary]:
        query = (
            self._summary_query()
            .where(TechniqueVersion.state.in_(list(states)))
            .order_by(TechniqueVersion.updated_at.desc())
        )
        if created_by is not None:
            query = query.where(TechniqueVersion.created_by == created_by)
        if reviewed_by is not None:
            # Las que aprobó (reviewed_by) o rechazó alguna vez (version_rejections),
            # sin contar las propias que publicó directo: revisar es sobre lo de otros.
            rejected = exists().where(
                VersionRejection.version_id == TechniqueVersion.id,
                VersionRejection.rejected_by == reviewed_by,
            )
            query = query.where(
                or_(TechniqueVersion.reviewed_by == reviewed_by, rejected),
                TechniqueVersion.created_by != reviewed_by,
            )
        return [
            VersionSummary(**row._mapping) for row in await self._session.execute(query)
        ]

    async def get_summary(self, version_id: UUID) -> VersionSummary | None:
        query = self._summary_query().where(TechniqueVersion.id == version_id)
        row = (await self._session.execute(query)).one_or_none()
        return VersionSummary(**row._mapping) if row else None

    async def get(self, version_id: UUID) -> VersionDetail | None:
        summary = await self.get_summary(version_id)
        if summary is None:
            return None
        [content] = await build_details(
            self._session, TechniqueVersion.id == version_id
        )
        rejections_query = (
            select(
                VersionRejection.reason,
                User.name.label("rejected_by"),
                VersionRejection.created_at,
            )
            .join(User, User.id == VersionRejection.rejected_by)
            .where(VersionRejection.version_id == version_id)
            .order_by(VersionRejection.created_at.desc())
        )
        rejections = tuple(
            Rejection(**row._mapping)
            for row in await self._session.execute(rejections_query)
        )
        return VersionDetail(summary=summary, content=content, rejections=rejections)

    async def get_published_of(self, technique_id: UUID) -> VersionSummary | None:
        query = self._summary_query().where(
            TechniqueVersion.technique_id == technique_id,
            TechniqueVersion.state == VersionState.published,
        )
        row = (await self._session.execute(query)).one_or_none()
        return VersionSummary(**row._mapping) if row else None

    async def has_version_in_progress(self, technique_id: UUID) -> bool:
        query = select(TechniqueVersion.id).where(
            TechniqueVersion.technique_id == technique_id,
            TechniqueVersion.state.in_(IN_PROGRESS),
        )
        return (await self._session.scalar(query)) is not None

    # --- Crear -----------------------------------------------------------

    async def create_technique(
        self, name: str, specialty_id: UUID, author_id: UUID
    ) -> UUID:
        """Crea la técnica con su versión 1 en borrador; devuelve el id de esta."""
        if await self._session.get(Specialty, specialty_id) is None:
            raise NotFound("La especialidad no existe")
        duplicate = await self._session.scalar(
            select(Technique.id).where(
                Technique.name == name, Technique.specialty_id == specialty_id
            )
        )
        if duplicate:
            raise Conflict("Ya hay una técnica con ese nombre en la especialidad")
        technique = Technique(
            name=name, specialty_id=specialty_id, created_by=author_id
        )
        self._session.add(technique)
        await self._session.flush()
        version = TechniqueVersion(
            technique_id=technique.id, number=1, created_by=author_id
        )
        self._session.add(version)
        await self._session.flush()
        version_id = version.id
        await self._session.commit()
        return version_id

    async def create_from_published(self, technique_id: UUID, author_id: UUID) -> UUID:
        """Copia la versión publicada en una versión nueva en borrador."""
        published = (
            await self._session.execute(
                select(TechniqueVersion)
                .where(
                    TechniqueVersion.technique_id == technique_id,
                    TechniqueVersion.state == VersionState.published,
                )
                .with_for_update()
            )
        ).scalar_one_or_none()
        if published is None:
            raise NotFound("La técnica no tiene una versión publicada")
        if await self.has_version_in_progress(technique_id):
            raise Conflict("La técnica ya tiene una versión en curso")
        last = await self._session.scalar(
            select(func.max(TechniqueVersion.number)).where(
                TechniqueVersion.technique_id == technique_id
            )
        )
        new = TechniqueVersion(
            technique_id=technique_id,
            number=last + 1,
            created_by=author_id,
            **{field_: getattr(published, field_) for field_ in CLINICAL_FIELDS},
        )
        self._session.add(new)
        await self._session.flush()
        new_id = new.id
        await self._copy_content(published.id, new_id)
        await self._session.commit()
        return new_id

    async def _copy_content(self, from_state: UUID, to_state: UUID) -> None:
        items = (
            await self._session.scalars(
                select(TechniqueItem).where(TechniqueItem.version_id == from_state)
            )
        ).all()
        new_items = {}
        for item in items:
            new_items[item.id] = TechniqueItem(
                version_id=to_state,
                zone_id=item.zone_id,
                legend_number=item.legend_number,
                source_text=item.source_text,
            )
        self._session.add_all(new_items.values())
        await self._session.flush()

        components = await self._session.scalars(
            select(ItemComponent)
            .where(ItemComponent.item_id.in_(new_items.keys()))
            .order_by(ItemComponent.id)
        )
        self._session.add_all(
            ItemComponent(
                item_id=new_items[c.item_id].id,
                instrument_id=c.instrument_id,
                suture_id=c.suture_id,
            )
            for c in components
        )
        positions = await self._session.scalars(
            select(ItemCell).where(ItemCell.version_id == from_state)
        )
        self._session.add_all(
            ItemCell(
                item_id=new_items[p.item_id].id,
                version_id=to_state,
                zone_id=p.zone_id,
                grid_row=p.grid_row,
                grid_column=p.grid_column,
            )
            for p in positions
        )
        for table, columns in (
            (VersionZone, ("zone_id", "used", "grid_rows", "grid_columns")),
            (VersionSuture, ("suture_id", "usage")),
            (VersionEquipment, ("equipment_id",)),
            (VersionDevice, ("device_id",)),
        ):
            origin = select(
                literal(to_state, TechniqueVersion.id.type).label("version_id"),
                *(getattr(table, c) for c in columns),
            ).where(table.version_id == from_state)
            await self._session.execute(
                insert(table).from_select(["version_id", *columns], origin)
            )
        await self._session.flush()

    # --- Editar un borrador ----------------------------------------------

    async def replace_content(self, version_id: UUID, content: VersionContent) -> None:
        version = await self._lock(version_id)
        if version.state != VersionState.draft:
            raise Conflict("Solo se puede editar una versión en borrador")
        await self._validate_references(content)

        for field_ in CLINICAL_FIELDS:
            setattr(version, field_, getattr(content, field_))
        version.updated_at = func.now()

        await self._delete_content(version_id)
        # Las mesas van primero: los objetos y sus celdas se ubican en ellas.
        self._session.add_all(
            VersionZone(
                version_id=version_id,
                zone_id=layout.zone_id,
                used=layout.used,
                grid_rows=layout.rows,
                grid_columns=layout.columns,
            )
            for layout in content.zones
        )
        items = []
        for item in content.items:
            row = TechniqueItem(
                version_id=version_id,
                zone_id=item.zone_id,
                legend_number=item.legend_number,
                source_text=item.source_text,
            )
            items.append((item, row))
        self._session.add_all(row for _, row in items)
        await self._session.flush()
        for item, row in items:
            self._session.add_all(
                ItemComponent(
                    item_id=row.id,
                    instrument_id=c.instrument_id,
                    suture_id=c.suture_id,
                )
                for c in item.components
            )
            self._session.add_all(
                ItemCell(
                    item_id=row.id,
                    version_id=version_id,
                    zone_id=item.zone_id,
                    grid_row=cell.row,
                    grid_column=cell.column,
                )
                for cell in set(item.cells)
            )

        for suture in content.sutures:
            suture_id = await self._suture(
                suture.name, suture.gauge, suture.needle_type
            )
            self._session.add(
                VersionSuture(
                    version_id=version_id, suture_id=suture_id, usage=suture.usage
                )
            )
        for name in content.equipment:
            equipment_id = await self._by_name(BiomedicalEquipment, name)
            self._session.add(
                VersionEquipment(version_id=version_id, equipment_id=equipment_id)
            )
        for name in content.devices:
            device_id = await self._by_name(MedicalDevice, name)
            self._session.add(VersionDevice(version_id=version_id, device_id=device_id))
        await self._session.flush()
        await self._session.commit()

    async def _validate_references(self, content: VersionContent) -> None:
        problems = []
        lookups = (
            (
                Zone,
                {i.zone_id for i in content.items} | {z.zone_id for z in content.zones},
                "la mesa",
            ),
            (
                Instrument,
                {c.instrument_id for i in content.items for c in i.components},
                "el instrumento",
            ),
            (
                Suture,
                {c.suture_id for i in content.items for c in i.components},
                "la sutura",
            ),
        )
        for model, ids, name in lookups:
            ids.discard(None)
            if not ids:
                continue
            existing = set(
                await self._session.scalars(select(model.id).where(model.id.in_(ids)))
            )
            for missing in ids - existing:
                problems.append(f"No existe {name} {missing}")
        if problems:
            raise InvalidContent(problems)

    async def _delete_content(self, version_id: UUID) -> None:
        items = select(TechniqueItem.id).where(TechniqueItem.version_id == version_id)
        await self._session.execute(
            delete(ItemCell).where(ItemCell.version_id == version_id)
        )
        await self._session.execute(
            delete(ItemComponent).where(ItemComponent.item_id.in_(items))
        )
        await self._session.execute(
            delete(TechniqueItem).where(TechniqueItem.version_id == version_id)
        )
        for table in (
            VersionZone,
            VersionSuture,
            VersionEquipment,
            VersionDevice,
        ):
            await self._session.execute(
                delete(table).where(table.version_id == version_id)
            )

    async def _suture(
        self, name: str, gauge: str | None, needle_type: str | None
    ) -> UUID:
        existing = await self._session.scalar(
            select(Suture.id).where(
                Suture.name == name,
                Suture.gauge.is_not_distinct_from(gauge),
                Suture.needle_type.is_not_distinct_from(needle_type),
            )
        )
        if existing:
            return existing
        suture = Suture(name=name, gauge=gauge, needle_type=needle_type)
        self._session.add(suture)
        await self._session.flush()
        return suture.id

    async def _by_name(self, model, name: str) -> UUID:
        existing = await self._session.scalar(
            select(model.id).where(model.name == name)
        )
        if existing:
            return existing
        new_ = model(name=name)
        self._session.add(new_)
        await self._session.flush()
        return new_.id

    async def discard_draft(self, version_id: UUID) -> None:
        """Borra un borrador con su contenido y sus rechazos. Si la técnica se
        queda sin versiones (nunca se publicó), se borra también."""
        version = await self._lock(version_id)
        if version.state != VersionState.draft:
            raise Conflict("Solo se descarta un borrador")
        technique_id = version.technique_id
        await self._delete_content(version_id)
        await self._session.execute(
            delete(VersionRejection).where(VersionRejection.version_id == version_id)
        )
        await self._session.delete(version)
        await self._session.flush()
        remaining = await self._session.scalar(
            select(TechniqueVersion.id).where(
                TechniqueVersion.technique_id == technique_id
            )
        )
        if remaining is None:
            await self._session.execute(
                delete(Technique).where(Technique.id == technique_id)
            )
        await self._session.commit()

    # --- Cambios de estado -----------------------------------------------

    async def _lock(self, version_id: UUID) -> TechniqueVersion:
        # FOR UPDATE: si dos personas cambian la misma versión a la vez, la
        # segunda espera a la primera y luego ve el estado ya cambiado.
        version = (
            await self._session.execute(
                select(TechniqueVersion)
                .where(TechniqueVersion.id == version_id)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if version is None:
            raise NotFound("La versión no existe")
        return version

    async def change_state(
        self,
        version_id: UUID,
        from_state: VersionState,
        to_state: VersionState,
        reviewer_id: UUID | None = None,
    ) -> None:
        version = await self._lock(version_id)
        if version.state != from_state:
            raise Conflict(
                f"La versión ya no está en {from_state}: ahora está en {version.state}"
            )
        if to_state == VersionState.published:
            # Primero la publicada anterior pasa a reemplazada: el índice
            # one_published_per_technique no deja dos publicadas a la vez.
            await self._session.execute(
                update(TechniqueVersion)
                .where(
                    TechniqueVersion.technique_id == version.technique_id,
                    TechniqueVersion.state == VersionState.published,
                )
                .values(
                    state=VersionState.superseded,
                    updated_at=func.now(),
                )
            )
            version.reviewed_by = reviewer_id
            version.reviewed_at = func.now()
        version.state = to_state
        version.updated_at = func.now()
        await self._session.flush()
        await self._session.commit()

    async def reject(self, version_id: UUID, reviewer_id: UUID, reason: str) -> None:
        version = await self._lock(version_id)
        if version.state != VersionState.in_review:
            raise Conflict(
                f"La versión ya no está en revisión: ahora está en {version.state}"
            )
        version.state = VersionState.draft
        version.updated_at = func.now()
        self._session.add(
            VersionRejection(
                version_id=version_id, rejected_by=reviewer_id, reason=reason
            )
        )
        await self._session.flush()
        await self._session.commit()

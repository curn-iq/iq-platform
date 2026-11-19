import asyncio
import time
from uuid import UUID

import httpx
from pydantic import BaseModel

from app.domain.catalog import (
    MAYO,
    SCOPE_SPECIALTY,
    Catalog,
    Cell,
    Instrument,
    TableItem,
    Technique,
)
from app.ports.catalog import CatalogDenied, CatalogUnavailable

# Lo que se lee de GET /catalog/full de DataIQ. Pydantic ignora los campos que no
# están aquí (datos clínicos, suturas, equipos…): SIVRI solo valida mesas.


class _Instrument(BaseModel):
    id: UUID
    name: str
    aliases: list[str]


class _Component(BaseModel):
    instrument_id: UUID | None
    name: str


class _Cell(BaseModel):
    row: int
    column: int


class _Item(BaseModel):
    zone: str | None
    legend_number: int | None
    source_text: str
    components: list[_Component]
    cells: list[_Cell]


class _Zone(BaseModel):
    zone: str
    used: bool
    rows: int | None
    columns: int | None


class _Technique(BaseModel):
    id: UUID
    name: str
    specialty: str
    zones: list[_Zone]
    items: list[_Item]


class _FullCatalog(BaseModel):
    instruments: list[_Instrument]
    techniques: list[_Technique]

    def to_domain(self) -> Catalog:
        techniques = []
        for t in self.techniques:
            zone = next((z for z in t.zones if z.zone == MAYO and z.used), None)
            if t.specialty != SCOPE_SPECIALTY or not (
                zone and zone.rows and zone.columns
            ):
                continue
            items = tuple(
                TableItem(
                    legend_number=i.legend_number,
                    # Un objeto con varios componentes (el mango y su hoja, las dos
                    # pinzas de disección) se nombra con «y».
                    name=" y ".join(c.name for c in i.components) or i.source_text,
                    instrument_ids=tuple(
                        c.instrument_id for c in i.components if c.instrument_id
                    ),
                    cells=tuple(Cell(c.row, c.column) for c in i.cells),
                )
                for i in t.items
                if i.zone == MAYO and i.cells
            )
            if items:
                techniques.append(
                    Technique(t.id, t.name, zone.rows, zone.columns, items)
                )
        return Catalog(
            techniques=tuple(techniques),
            instruments=tuple(
                Instrument(i.id, i.name, tuple(i.aliases)) for i in self.instruments
            ),
        )


class DataIQCatalogSource:
    """Pide el catálogo completo a DataIQ con el token de quien usa SIVRI y lo guarda
    en memoria el tiempo que DataIQ indica (5 minutos): «el catálogo se pide una vez
    por sesión» (docs/arquitectura.md). Pasado ese tiempo pregunta con el ETag si
    cambió: si no, DataIQ responde 304 sin cuerpo. Es una copia de paso: la fuente
    de verdad sigue siendo DataIQ, y no se guarda en ningún archivo ni tabla.

    El catálogo es igual para cualquier cuenta (solo lo publicado), así que la copia
    se comparte entre quienes usan SIVRI; el token de cada uno sirve para que DataIQ
    compruebe que tiene cuenta.
    """

    def __init__(
        self,
        base_url: str,
        max_age: float = 300,
        retry_after: float = 30,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._url = f"{base_url.rstrip('/')}/catalog/full"
        self._max_age = max_age
        self._retry_after = retry_after
        self._transport = transport
        self._catalog: Catalog | None = None
        self._etag: str | None = None
        self._fetched_at: float | None = None
        self._lock = asyncio.Lock()

    async def get(self, token: str) -> Catalog:
        async with self._lock:
            if self._catalog is None or self._stale():
                await self._fetch(token)
            assert self._catalog is not None
            return self._catalog

    def _stale(self) -> bool:
        return (
            self._fetched_at is None
            or time.monotonic() - self._fetched_at > self._max_age
        )

    async def _fetch(self, token: str) -> None:
        headers = {"Authorization": f"Bearer {token}"}
        if self._etag and self._catalog is not None:
            headers["If-None-Match"] = self._etag
        try:
            async with httpx.AsyncClient(
                transport=self._transport, timeout=10
            ) as client:
                response = await client.get(self._url, headers=headers)
        except httpx.HTTPError as error:
            self._fall_back_or_raise(error)
            return
        if response.status_code in (401, 403):
            raise CatalogDenied(response.text)
        if response.status_code == 304 and self._catalog is not None:
            self._fetched_at = time.monotonic()
            return
        try:
            response.raise_for_status()
            catalog = _FullCatalog.model_validate_json(response.content).to_domain()
        except (httpx.HTTPError, ValueError) as error:
            self._fall_back_or_raise(error)
            return
        self._catalog = catalog
        self._etag = response.headers.get("etag")
        self._fetched_at = time.monotonic()

    def _fall_back_or_raise(self, error: Exception) -> None:
        if self._catalog is None:
            raise CatalogUnavailable(str(error)) from error
        # Con la copia anterior se sigue respondiendo mientras DataIQ vuelve. Se
        # reintenta pasados retry_after segundos, no en cada cuadro: cada intento
        # fallido puede tardar hasta el timeout.
        self._fetched_at = time.monotonic() - self._max_age + self._retry_after

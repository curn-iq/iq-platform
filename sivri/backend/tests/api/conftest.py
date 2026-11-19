from uuid import NAMESPACE_DNS, UUID, uuid5

import pytest
from httpx import ASGITransport, AsyncClient

from app.adapters.inbound.api.dependencies import (
    get_analyzer,
    get_catalog_source,
    get_class_map_provider,
    get_verifier,
)
from app.adapters.outbound.vision.aruco import ArucoMarkerFinder
from app.adapters.outbound.vision.fake import FakeDetector
from app.application.analysis import FrameAnalyzer
from app.domain.catalog import Catalog, Cell, Instrument, TableItem, Technique
from app.domain.classes import ClassEntry, ClassMap
from app.domain.validation import ValidationSettings
from app.main import app
from app.ports.catalog import CatalogDenied, CatalogUnavailable

KELLY, ALLIS, METZ = "Pinza Kelly", "Pinza de Allis", "Tijera de Metzenbaum"


def uid(name: str) -> UUID:
    return uuid5(NAMESPACE_DNS, name)


def item(number, name, *cells):
    return TableItem(number, name, (uid(name),), tuple(Cell(r, c) for r, c in cells))


PRUEBA = Technique(
    uid("Prueba"),
    "Prueba",
    4,
    4,
    (item(1, ALLIS, (1, 1)), item(2, KELLY, (2, 3)), item(3, METZ, (4, 1), (4, 2))),
)
OTRA = Technique(
    uid("Otra"),
    "Otra",
    4,
    4,
    (item(1, ALLIS, (4, 4)), item(2, KELLY, (4, 3)), item(3, METZ, (3, 3))),
)
CATALOG = Catalog(
    (PRUEBA, OTRA), tuple(Instrument(uid(n), n, ()) for n in (KELLY, ALLIS, METZ))
)
CLASSES = ClassMap(ClassEntry(n, uid(n)) for n in (KELLY, ALLIS, METZ))


class FakeCatalog:
    def __init__(self) -> None:
        self.tokens: list[str] = []
        self.error: Exception | None = None

    async def get(self, token: str) -> Catalog:
        self.tokens.append(token)
        if self.error:
            raise self.error
        return CATALOG


class FakeClasses:
    async def get(self) -> ClassMap:
        return CLASSES


class Setup:
    """Lo que cambia en cada prueba: qué ve el detector y cómo responde DataIQ."""

    def __init__(self, verifier) -> None:
        self.catalog = FakeCatalog()
        self.detections: list = []
        self.verifier = verifier
        self.analyzer = FrameAnalyzer(
            _Detector(self), ArucoMarkerFinder(), ValidationSettings()
        )

    @property
    def unavailable(self):
        return CatalogUnavailable("DataIQ no responde")

    @property
    def denied(self):
        return CatalogDenied("no")


class _Detector(FakeDetector):
    def __init__(self, setup: Setup) -> None:
        super().__init__()
        self._setup = setup

    def detect(self, image):
        return list(self._setup.detections)


@pytest.fixture
def setup(verifier) -> Setup:
    setup = Setup(verifier)
    app.dependency_overrides[get_verifier] = lambda: setup.verifier
    app.dependency_overrides[get_catalog_source] = lambda: setup.catalog
    app.dependency_overrides[get_class_map_provider] = lambda: FakeClasses()
    app.dependency_overrides[get_analyzer] = lambda: setup.analyzer
    yield setup
    app.dependency_overrides.clear()


@pytest.fixture
async def client(setup):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="https://prueba"
    ) as c:
        yield c


@pytest.fixture
def bearer(dataiq) -> dict[str, str]:
    return {"Authorization": f"Bearer {dataiq.token()}"}

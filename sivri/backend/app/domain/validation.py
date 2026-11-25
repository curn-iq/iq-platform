"""Cómo se valida la mesa (sivri/docs/validacion.md, «Cómo se valida la mesa»).

Detectar, emparejar cada detección con su posición esperada y darle un estado a
cada objeto («planogram compliance»). Todo en unidades de celda: el área ampliada
a partir de los marcadores se reparte según la cuadrícula de la técnica, y una
celda mide 1 × 1.
"""

import math
from collections import defaultdict
from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

import numpy as np
from scipy.optimize import linear_sum_assignment

from app.domain.board import Board
from app.domain.catalog import Cell, Technique, normalize
from app.domain.classes import ClassMap
from app.domain.expected import ExpectedObject, expected_objects
from app.domain.location import extra_message, missing_message, move_message
from app.domain.vision import Detection


class Status(StrEnum):
    IN_PLACE = "in_place"  # En su lugar
    MOVE = "move"  # Mover, con hacia dónde
    DOUBTFUL = "doubtful"  # En el margen técnico: no se le dice nada al estudiante
    MISSING = "missing"  # Falta
    EXTRA = "extra"  # Sobra


@dataclass(frozen=True)
class ValidationSettings:
    """Puntos de partida que se ajustan con las fotos de validación."""

    # Franja junto al borde de las celdas de un objeto (fracción del lado de la
    # celda, a cada lado del borde) donde un instrumento cuenta como «dudoso»:
    # puede ser imprecisión de la medición, no del estudiante.
    margin: float = 0.10
    # Diferencia de porcentaje entre las dos técnicas más parecidas con la que se
    # muestran las dos.
    close_gap: float = 0.05


@dataclass(frozen=True)
class PlacedDetection:
    """Una detección con el centro de su caja en coordenadas de la mesa."""

    detection: Detection
    u: float
    v: float


def place(detections: list[Detection], board: Board) -> list[PlacedDetection]:
    placed = []
    for detection in detections:
        u, v = board.to_board(*detection.box.center)
        placed.append(PlacedDetection(detection, u, v))
    return placed


@dataclass(frozen=True)
class ObjectResult:
    status: Status
    label: str | None
    instrument_id: UUID | None
    legend_number: int | None
    expected_cells: tuple[Cell, ...]
    detection: Detection | None
    # La celda donde cae el centro de la caja (puede estar fuera de la cuadrícula).
    found_cell: Cell | None = None
    # Cuántas celdas hay que moverlo para llevarlo a la suya: filas hacia abajo y
    # columnas hacia la derecha (negativas: hacia arriba y hacia la izquierda).
    move_rows: int = 0
    move_columns: int = 0
    # Lo que se le dice al estudiante (zona de la mesa, lo que tiene al lado y su
    # número del diagrama; nunca filas ni celdas). None si no hay nada que decirle:
    # en su lugar o dudoso.
    message: str | None = None


@dataclass(frozen=True)
class TechniqueResult:
    technique_id: UUID
    name: str
    # Instrumentos en su lugar (o dudosos) sobre los esperados.
    percent: float
    in_place: int
    expected: int
    objects: list[ObjectResult]
    extras: list[ObjectResult]

    @property
    def likeness(self) -> float:
        """Cuánto se parece la mesa a esta técnica: lo que está en su lugar sobre
        lo que la técnica espera más los instrumentos que sobran para ella. Sin
        descontar lo que sobra, una técnica con menos piezas parecía tan buena
        como la armada (Mastectomía 9 de 10 frente a Tiroidectomía 12 de 13 en
        una Tiroidectomía bien armada, 2026-11-23)."""
        total = self.expected + len(self.extras)
        return self.in_place / total if total else 0.0


@dataclass(frozen=True)
class Recognition:
    """Las cinco técnicas ordenadas por parecido y las que se muestran."""

    ranking: list[TechniqueResult]
    shown: list[TechniqueResult]


# --- Posición de un instrumento respecto de sus celdas ------------------------


def _cell_at(x: float, y: float) -> Cell:
    return Cell(math.floor(y) + 1, math.floor(x) + 1)


def _distance(x: float, y: float, cell: Cell) -> float:
    """Distancia del punto al rectángulo de la celda (0 si cae dentro)."""
    dx = max(cell.column - 1 - x, 0.0, x - cell.column)
    dy = max(cell.row - 1 - y, 0.0, y - cell.row)
    return math.hypot(dx, dy)


def _depth(x: float, y: float, cell: Cell, cells: set[Cell]) -> float:
    """Qué tan adentro de sus celdas está un punto que cae en `cell`: la distancia
    al borde más cercano que da afuera del objeto (los bordes entre dos celdas del
    mismo objeto no cuentan)."""
    edges = []
    if Cell(cell.row, cell.column - 1) not in cells:
        edges.append(x - (cell.column - 1))
    if Cell(cell.row, cell.column + 1) not in cells:
        edges.append(cell.column - x)
    if Cell(cell.row - 1, cell.column) not in cells:
        edges.append(y - (cell.row - 1))
    if Cell(cell.row + 1, cell.column) not in cells:
        edges.append(cell.row - y)
    return min(edges, default=math.inf)


def _judge(
    x: float, y: float, cells: tuple[Cell, ...], margin: float
) -> tuple[Status, Cell, int, int]:
    """El estado de un instrumento con el centro de su caja en (x, y), contra las
    celdas donde va."""
    found = _cell_at(x, y)
    expected = set(cells)
    if found in expected:
        inside = _depth(x, y, found, expected) >= margin
        return (Status.IN_PLACE if inside else Status.DOUBTFUL, found, 0, 0)
    nearest = min(cells, key=lambda c: _distance(x, y, c))
    if _distance(x, y, nearest) <= margin:
        return (Status.DOUBTFUL, found, 0, 0)
    return (
        Status.MOVE,
        found,
        nearest.row - found.row,
        nearest.column - found.column,
    )


def _cost(x: float, y: float, expected: ExpectedObject) -> float:
    return min(
        math.hypot(x - (c.column - 0.5), y - (c.row - 0.5)) for c in expected.cells
    )


# --- La validación de una técnica ---------------------------------------------


def validate_technique(
    technique: Technique,
    classes: ClassMap,
    placed: list[PlacedDetection],
    settings: ValidationSettings = ValidationSettings(),
) -> TechniqueResult:
    """Compara lo detectado con la mesa de la técnica.

    1. Empareja por clase y posición. Ante varias detecciones, prioriza
       cubrir las posiciones aceptables y desempata por distancia.
    2. Evalúa las posiciones esperadas. Cada tipo ajeno genera un solo aviso.
    """
    expected_by_class: dict[str, list[ExpectedObject]] = defaultdict(list)
    for expected in expected_objects(technique, classes):
        expected_by_class[normalize(expected.label)].append(expected)
    found_by_class: dict[str, list[PlacedDetection]] = defaultdict(list)
    for item in placed:
        found_by_class[normalize(item.detection.label)].append(item)

    objects: list[ObjectResult] = []
    extras: list[ObjectResult] = []

    def position(item: PlacedDetection) -> tuple[float, float]:
        return (item.u * technique.columns, item.v * technique.rows)

    def extra(item: PlacedDetection) -> ObjectResult:
        x, y = position(item)
        label = item.detection.label
        return ObjectResult(
            Status.EXTRA,
            label,
            classes.instrument_id(label),
            None,
            (),
            item.detection,
            _cell_at(x, y),
            message=extra_message(label),
        )

    for key in expected_by_class.keys() | found_by_class.keys():
        wanted = expected_by_class.get(key, [])
        seen = found_by_class.get(key, [])
        if not wanted:
            extras.append(extra(max(seen, key=lambda item: item.detection.confidence)))
            continue
        pairs: list[tuple[int, int]] = []
        if seen:
            costs = np.array(
                [[_cost(*position(item), e) for item in seen] for e in wanted]
            )
            if len(seen) > 1:
                # Una sola indicación de mover pesa más que cualquier diferencia
                # en la suma de distancias entre emparejamientos de esta clase.
                penalty = min(costs.shape) * costs.max() + 1
                for i, expected in enumerate(wanted):
                    for j, item in enumerate(seen):
                        x, y = position(item)
                        if all(
                            _distance(x, y, c) > settings.margin for c in expected.cells
                        ):
                            costs[i, j] += penalty
            rows, columns = linear_sum_assignment(costs)
            pairs = list(zip(rows.tolist(), columns.tolist(), strict=True))
        matched_expected = {i for i, _ in pairs}
        for i, j in pairs:
            e, item = wanted[i], seen[j]
            status, found, move_rows, move_columns = _judge(
                *position(item), e.cells, settings.margin
            )
            objects.append(
                ObjectResult(
                    status,
                    e.label,
                    e.instrument_id,
                    e.legend_number,
                    e.cells,
                    item.detection,
                    found,
                    move_rows,
                    move_columns,
                    move_message(technique, e.label, e.legend_number, e.cells)
                    if status is Status.MOVE
                    else None,
                )
            )
        for i, e in enumerate(wanted):
            if i not in matched_expected:
                objects.append(
                    ObjectResult(
                        Status.MISSING,
                        e.label,
                        e.instrument_id,
                        e.legend_number,
                        e.cells,
                        None,
                        message=missing_message(
                            technique, e.label, e.legend_number, e.cells
                        ),
                    )
                )

    objects.sort(key=lambda o: (o.legend_number is None, o.legend_number or 0, o.label))
    extras.sort(key=lambda o: o.label or "")
    total = sum(len(v) for v in expected_by_class.values())
    # Un «dudoso» no es un error para el estudiante: cuenta como en su lugar.
    fine = sum(o.status in (Status.IN_PLACE, Status.DOUBTFUL) for o in objects)
    return TechniqueResult(
        technique.id,
        technique.name,
        fine / total if total else 0.0,
        fine,
        total,
        objects,
        extras,
    )


def recognize(
    techniques: list[Technique],
    classes: ClassMap,
    placed: list[PlacedDetection],
    settings: ValidationSettings = ValidationSettings(),
) -> Recognition:
    """Reconoce de qué técnica es la mesa: la que más se parece (`likeness`), o
    las dos que más se parecen si quedan muy cerca. El estudiante no elige la
    técnica. El porcentaje que se muestra sigue siendo el de su propia mesa."""
    ranking = sorted(
        (validate_technique(t, classes, placed, settings) for t in techniques),
        key=lambda r: (-r.likeness, -r.percent, -r.in_place, r.name),
    )
    shown = ranking[:1]
    if (
        len(ranking) > 1
        and ranking[0].likeness - ranking[1].likeness <= settings.close_gap
    ):
        shown = ranking[:2]
    return Recognition(ranking, shown)

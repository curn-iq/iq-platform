from uuid import UUID

from pydantic import BaseModel

from app.application.analysis import Analysis
from app.domain.catalog import Cell, Technique
from app.domain.classes import ClassMap
from app.domain.validation import ObjectResult, Status, TechniqueResult
from app.domain.vision import Box


class HealthOut(BaseModel):
    status: str
    # Dónde está el código fuente: SIVRI es AGPL-3.0 y quien lo usa por internet
    # puede obtenerlo.
    source: str


class CellOut(BaseModel):
    """Una celda de la cuadrícula de la técnica (fila 1 arriba, columna 1 a la
    izquierda). Es para dibujar sobre el video; al estudiante no se le habla de
    filas ni de columnas."""

    row: int
    column: int


class BoxOut(BaseModel):
    """Una caja como fracción del cuadro (0 a 1): el celular la dibuja sobre el video
    sin importar a qué tamaño lo envió."""

    x1: float
    y1: float
    x2: float
    y2: float


class MarkerOut(BaseModel):
    id: int
    x: float
    y: float


class DetectionOut(BaseModel):
    label: str
    instrument_id: UUID | None
    confidence: float
    box: BoxOut


class MoveOut(BaseModel):
    """Cuántas celdas hay que mover el instrumento: filas hacia abajo y columnas
    hacia la derecha (negativas: hacia arriba y hacia la izquierda)."""

    rows: int
    columns: int


class ObjectOut(BaseModel):
    status: Status
    label: str | None
    instrument_id: UUID | None
    # El número del diagrama de IQ.
    legend_number: int | None
    expected_cells: list[CellOut]
    found_cell: CellOut | None
    box: BoxOut | None
    # Para dibujar una flecha. Al estudiante no se le dice en filas ni columnas:
    # para eso es `message`.
    move: MoveOut | None
    # Lo que se le dice al estudiante, en la forma de la práctica: la zona de la
    # mesa, lo que tiene al lado y su número del diagrama («Pinza Kelly (n.º 2): va
    # en el centro, a la derecha, junto a Pinza Rochester (n.º 3).»). `null` si está
    # en su lugar o dudoso: no hay nada que decirle.
    message: str | None


class TechniqueResultOut(BaseModel):
    technique_id: UUID
    name: str
    percent: float
    in_place: int
    expected: int
    objects: list[ObjectOut]
    extras: list[ObjectOut]


class RankingOut(BaseModel):
    technique_id: UUID
    name: str
    percent: float


class FrameOut(BaseModel):
    """El resultado de un cuadro."""

    markers: list[MarkerOut]
    # Están los cuatro marcadores: sin ellos no hay mesa y no se valida.
    board_found: bool
    detections: list[DetectionOut]
    # Alguna técnica se parece a lo que se ve (porcentaje mayor que 0).
    recognized: bool
    # La técnica que más se parece o, si quedan muy cerca, las dos que más.
    techniques: list[TechniqueResultOut]
    # Las técnicas validadas, de la más parecida a la menos.
    ranking: list[RankingOut]


class TechniqueOut(BaseModel):
    id: UUID
    name: str
    # Cuántos instrumentos reconocibles lleva su mesa de Mayo.
    expected: int


def _box(box: Box, width: int, height: int) -> BoxOut:
    return BoxOut(
        x1=box.x1 / width, y1=box.y1 / height, x2=box.x2 / width, y2=box.y2 / height
    )


def _cell(cell: Cell) -> CellOut:
    return CellOut(row=cell.row, column=cell.column)


def _object(o: ObjectResult, width: int, height: int) -> ObjectOut:
    return ObjectOut(
        status=o.status,
        label=o.label,
        instrument_id=o.instrument_id,
        legend_number=o.legend_number,
        expected_cells=[_cell(c) for c in o.expected_cells],
        found_cell=_cell(o.found_cell) if o.found_cell else None,
        box=_box(o.detection.box, width, height) if o.detection else None,
        move=(
            MoveOut(rows=o.move_rows, columns=o.move_columns)
            if o.status is Status.MOVE
            else None
        ),
        message=o.message,
    )


def _technique(r: TechniqueResult, width: int, height: int) -> TechniqueResultOut:
    return TechniqueResultOut(
        technique_id=r.technique_id,
        name=r.name,
        percent=r.percent,
        in_place=r.in_place,
        expected=r.expected,
        objects=[_object(o, width, height) for o in r.objects],
        extras=[_object(o, width, height) for o in r.extras],
    )


def frame_out(analysis: Analysis, classes: ClassMap) -> FrameOut:
    w, h = analysis.width, analysis.height
    recognition = analysis.recognition
    ranking = recognition.ranking if recognition else []
    return FrameOut(
        markers=[MarkerOut(id=m.id, x=m.x / w, y=m.y / h) for m in analysis.markers],
        board_found=analysis.board_found,
        detections=[
            DetectionOut(
                label=d.label,
                instrument_id=classes.instrument_id(d.label),
                confidence=d.confidence,
                box=_box(d.box, w, h),
            )
            for d in analysis.detections
        ],
        recognized=bool(ranking and ranking[0].percent > 0),
        techniques=[
            _technique(r, w, h) for r in (recognition.shown if recognition else [])
        ],
        ranking=[
            RankingOut(technique_id=r.technique_id, name=r.name, percent=r.percent)
            for r in ranking
        ],
    )


def technique_out(technique: Technique, classes: ClassMap) -> TechniqueOut:
    from app.domain.expected import expected_objects

    return TechniqueOut(
        id=technique.id,
        name=technique.name,
        expected=len(expected_objects(technique, classes)),
    )

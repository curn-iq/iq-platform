"""Lo que SIVRI hace con un cuadro de la cámara: lo reduce, busca los marcadores y
los instrumentos, y con la mesa que dan los marcadores reconoce la técnica y
valida cada objeto."""

from dataclasses import dataclass
from uuid import UUID

import cv2
import numpy as np

from app.domain.board import Board
from app.domain.catalog import Catalog
from app.domain.classes import ClassMap
from app.domain.validation import (
    Recognition,
    ValidationSettings,
    place,
    recognize,
)
from app.domain.vision import Detection, Marker
from app.ports.detector import Detector, MarkerFinder


class InvalidImage(Exception):
    """Los bytes no son una imagen que se pueda leer."""


class UnknownTechnique(Exception):
    """La técnica pedida no está entre las que SIVRI valida."""


@dataclass(frozen=True)
class Analysis:
    # Tamaño de la imagen ya reducida: las cajas y los marcadores vienen en sus
    # píxeles.
    width: int
    height: int
    markers: list[Marker]
    detections: list[Detection]
    # Sin los cuatro marcadores no hay mesa: se nombra lo que se ve, pero no se
    # valida nada.
    board_found: bool
    recognition: Recognition | None


class FrameAnalyzer:
    def __init__(
        self,
        detector: Detector,
        finder: MarkerFinder,
        settings: ValidationSettings,
        max_side: int = 1280,
        board_padding: float = 0.10,
    ) -> None:
        self._detector = detector
        self._finder = finder
        self._settings = settings
        self._max_side = max_side
        self._board_padding = board_padding

    def decode(self, data: bytes) -> np.ndarray:
        """Lee los bytes de una imagen (JPEG, PNG…) y la reduce si es muy grande."""
        if not data:
            raise InvalidImage("No se pudo leer la imagen")
        try:
            image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        except cv2.error as error:
            raise InvalidImage("No se pudo leer la imagen") from error
        if image is None:
            raise InvalidImage("No se pudo leer la imagen")
        side = max(image.shape[:2])
        if side > self._max_side:
            scale = self._max_side / side
            height, width = image.shape[:2]
            size = (max(1, round(width * scale)), max(1, round(height * scale)))
            image = cv2.resize(image, size, interpolation=cv2.INTER_AREA)
        return image

    def analyze(
        self,
        image: np.ndarray,
        catalog: Catalog,
        classes: ClassMap,
        technique_id: UUID | None = None,
    ) -> Analysis:
        """Trabajo de CPU: llamarlo en un hilo aparte. Con `technique_id` valida la
        mesa contra esa técnica; sin él, reconoce de cuál de las cinco es."""
        techniques = list(catalog.techniques)
        if technique_id is not None:
            techniques = [t for t in techniques if t.id == technique_id]
            if not techniques:
                raise UnknownTechnique(str(technique_id))
        height, width = image.shape[:2]
        markers = self._finder.find(image)
        detections = self._detector.detect(image)
        board = Board.from_markers(markers, self._board_padding)
        recognition = (
            recognize(techniques, classes, place(detections, board), self._settings)
            if board
            else None
        )
        return Analysis(
            width, height, markers, detections, board is not None, recognition
        )

import json
from pathlib import Path

import numpy as np

from app.domain.vision import Box, Detection


class FakeDetector:
    """El detector de pruebas: devuelve las detecciones que se le dan, o las de un
    archivo JSON (`FAKE_DETECTIONS`), para desarrollar la API y la página sin el
    modelo entrenado. El archivo es una lista de
    `{"label": "Pinza Kelly", "box": [x1, y1, x2, y2], "confidence": 0.9}`, con la
    caja en píxeles de la imagen que se manda."""

    def __init__(self, detections: list[Detection] | None = None) -> None:
        self._detections = detections or []

    @classmethod
    def from_file(cls, path: str) -> FakeDetector:
        if not path:
            return cls()
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(
            [
                Detection(d["label"], Box(*d["box"]), float(d.get("confidence", 0.9)))
                for d in data
            ]
        )

    def detect(self, image: np.ndarray) -> list[Detection]:
        return list(self._detections)

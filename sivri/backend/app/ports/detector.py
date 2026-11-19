from typing import Protocol

import numpy as np

from app.domain.vision import Detection, Marker


class Detector(Protocol):
    def detect(self, image: np.ndarray) -> list[Detection]:
        """Los instrumentos que se ven en la imagen (BGR, uint8), con su caja en
        píxeles. Es trabajo de CPU: se llama en un hilo aparte."""
        ...


class MarkerFinder(Protocol):
    def find(self, image: np.ndarray) -> list[Marker]:
        """Los marcadores ArUco que se ven en la imagen (BGR, uint8)."""
        ...

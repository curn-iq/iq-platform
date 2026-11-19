import cv2
import numpy as np

from app.domain.vision import Marker


class ArucoMarkerFinder:
    """Encuentra los marcadores ArUco con OpenCV. Son los del protocolo de fotos
    (`marcadores-aruco.pdf`): diccionario 4x4 de 50, ids 0 a 3."""

    def __init__(self, dictionary: int = cv2.aruco.DICT_4X4_50) -> None:
        self._detector = cv2.aruco.ArucoDetector(
            cv2.aruco.getPredefinedDictionary(dictionary),
            cv2.aruco.DetectorParameters(),
        )

    def find(self, image: np.ndarray) -> list[Marker]:
        corners, ids, _ = self._detector.detectMarkers(image)
        if ids is None:
            return []
        found: dict[int, Marker] = {}
        for quad, marker_id in zip(corners, ids.flatten().tolist(), strict=True):
            x, y = quad.reshape(4, 2).mean(axis=0).tolist()
            # Un id repetido en la imagen (un reflejo, otro marcador igual) no deja
            # saber cuál es el de la esquina: se descarta.
            found[marker_id] = (
                Marker(marker_id, x, y) if marker_id not in found else found[marker_id]
            )
        return sorted(found.values(), key=lambda m: m.id)

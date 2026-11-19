"""Cuadros de prueba: una mesa vista desde arriba con los cuatro marcadores y una
cuadrícula de 4 × 4 entre sus centros."""

import cv2
import numpy as np

from app.domain.vision import Box, Detection

WIDTH, HEIGHT = 840, 640
DICTIONARY = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
# Los centros de los marcadores: la mesa va de (100, 100) a (740, 540).
LEFT, TOP, RIGHT, BOTTOM = 100, 100, 740, 540


def _marker(marker_id: int) -> np.ndarray:
    bits = cv2.aruco.generateImageMarker(DICTIONARY, marker_id, 80)
    return cv2.copyMakeBorder(bits, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)


def jpeg(markers=(0, 1, 2, 3)) -> bytes:
    image = np.full((HEIGHT, WIDTH, 3), 200, np.uint8)
    centers = {0: (LEFT, TOP), 1: (RIGHT, TOP), 2: (RIGHT, BOTTOM), 3: (LEFT, BOTTOM)}
    for marker_id in markers:
        x, y = centers[marker_id]
        tile = _marker(marker_id)
        h, w = tile.shape
        image[y - h // 2 : y + h // 2, x - w // 2 : x + w // 2] = tile[:, :, None]
    ok, data = cv2.imencode(".jpg", image)
    assert ok
    return data.tobytes()


def at(label: str, row: float, column: float) -> Detection:
    """Un instrumento con el centro de su caja en (row, column) de la cuadrícula de
    4 × 4, en unidades de celda (la celda 1,1 va de 0 a 1)."""
    x = LEFT + (RIGHT - LEFT) * column / 4
    y = TOP + (BOTTOM - TOP) * row / 4
    return Detection(label, Box(x - 25, y - 15, x + 25, y + 15), 0.9)

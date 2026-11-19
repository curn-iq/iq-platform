import cv2
import numpy as np

from app.adapters.outbound.vision.aruco import ArucoMarkerFinder
from app.domain.board import Board

DICTIONARY = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)


def marker(marker_id: int, size: int = 80) -> np.ndarray:
    bits = cv2.aruco.generateImageMarker(DICTIONARY, marker_id, size)
    # Borde blanco, como el del papel recortado.
    return cv2.copyMakeBorder(bits, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)


def table(ids=(0, 1, 2, 3)) -> np.ndarray:
    """Una mesa vista desde arriba: marcadores en las cuatro esquinas, 800 × 600."""
    image = np.full((600, 800, 3), 200, np.uint8)
    spots = {0: (40, 40), 1: (680, 40), 2: (680, 480), 3: (40, 480)}
    for marker_id in ids:
        x, y = spots[marker_id]
        tile = marker(marker_id)
        image[y : y + tile.shape[0], x : x + tile.shape[1]] = tile[:, :, None]
    return image


def test_it_finds_the_four_markers_of_the_protocol_in_order():
    found = ArucoMarkerFinder().find(table())

    assert [m.id for m in found] == [0, 1, 2, 3]
    # Cada centro queda dentro de su esquina.
    assert found[0].x < 400 and found[0].y < 300
    assert found[2].x > 400 and found[2].y > 300


def test_it_finds_fewer_when_one_is_covered():
    found = ArucoMarkerFinder().find(table(ids=(0, 1, 3)))

    assert [m.id for m in found] == [0, 1, 3]
    assert Board.from_markers(found) is None


def test_it_finds_nothing_in_an_empty_table():
    assert ArucoMarkerFinder().find(np.full((600, 800, 3), 200, np.uint8)) == []


def test_a_tilted_photo_still_gives_a_board_with_the_right_center():
    image = table()
    source = np.float32([[0, 0], [800, 0], [800, 600], [0, 600]])
    target = np.float32([[60, 40], [740, 90], [780, 580], [20, 560]])
    warped = cv2.warpPerspective(
        image, cv2.getPerspectiveTransform(source, target), (800, 600)
    )

    markers = ArucoMarkerFinder().find(warped)
    board = Board.from_markers(markers)

    assert board is not None
    # El centro de los cuatro marcadores originales, (420, 320), es el de la mesa.
    center = cv2.perspectiveTransform(
        np.float32([[[420, 320]]]), cv2.getPerspectiveTransform(source, target)
    )[0][0]
    u, v = board.to_board(float(center[0]), float(center[1]))
    assert abs(u - 0.5) < 0.03 and abs(v - 0.5) < 0.03

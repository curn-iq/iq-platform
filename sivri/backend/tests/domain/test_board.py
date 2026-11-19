import pytest

from app.domain.board import Board
from app.domain.vision import Marker


def markers(corners):
    return [Marker(i, x, y) for i, (x, y) in enumerate(corners)]


def test_markers_straight_on_map_the_image_to_the_unit_square():
    board = Board.from_markers(markers([(100, 50), (500, 50), (500, 350), (100, 350)]))

    assert board is not None
    assert board.to_board(100, 50) == pytest.approx((0, 0))
    assert board.to_board(500, 350) == pytest.approx((1, 1))
    assert board.to_board(300, 200) == pytest.approx((0.5, 0.5))


def test_a_tilted_camera_still_finds_the_same_point_of_the_table():
    # La misma mesa vista en perspectiva: la parte de abajo se ve más ancha.
    board = Board.from_markers(markers([(150, 60), (450, 60), (560, 360), (40, 360)]))

    assert board is not None
    for corner, expected in zip(
        [(150, 60), (450, 60), (560, 360), (40, 360)],
        [(0, 0), (1, 0), (1, 1), (0, 1)],
        strict=True,
    ):
        assert board.to_board(*corner) == pytest.approx(expected)
    # El punto medio de la mesa no es el medio de la imagen: la perspectiva lo
    # corre hacia abajo.
    u, v = board.to_board(300, 210)
    assert u == pytest.approx(0.5, abs=0.01)
    assert v == pytest.approx(0.5, abs=0.15)


def test_without_the_four_markers_there_is_no_board():
    assert Board.from_markers(markers([(0, 0), (10, 0), (10, 10)])) is None


def test_markers_on_a_line_do_not_make_a_board():
    assert Board.from_markers(markers([(0, 0), (1, 1), (2, 2), (3, 3)])) is None


def test_a_point_outside_the_markers_leaves_the_unit_square():
    board = Board.from_markers(markers([(100, 50), (500, 50), (500, 350), (100, 350)]))

    u, v = board.to_board(600, 400)

    assert u > 1 and v > 1

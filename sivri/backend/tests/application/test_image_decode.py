import struct
import zlib

import cv2
import numpy as np
import pytest

from app.application import analysis
from app.application.analysis import FrameAnalyzer, InvalidImage
from app.application.image_header import image_size


def png(width: int, height: int) -> bytes:
    """Un PNG de un solo color: pesa poco y decodificado ocupa mucho."""

    def chunk(kind: bytes, body: bytes) -> bytes:
        crc = zlib.crc32(kind + body)
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", crc)

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    row = b"\x00" + b"\x10\x20\x30" * width
    data = zlib.compress(row * height, 9)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", data)
        + chunk(b"IEND", b"")
    )


def jpeg(width: int, height: int) -> bytes:
    ok, data = cv2.imencode(".jpg", np.zeros((height, width, 3), np.uint8))
    assert ok
    return data.tobytes()


def analyzer(**options) -> FrameAnalyzer:
    return FrameAnalyzer(None, None, None, **options)  # type: ignore[arg-type]


def test_the_size_is_read_from_the_png_and_jpeg_headers():
    assert image_size(png(30, 20)) == (30, 20)
    assert image_size(jpeg(30, 20)) == (30, 20)


@pytest.mark.parametrize(
    "data",
    [b"", b"no es una imagen", b"\x89PNG\r\n\x1a\n", b"\xff\xd8", b"\xff\xd8\xff"],
)
def test_what_is_not_a_readable_jpeg_or_png_has_no_size(data):
    assert image_size(data) is None


def test_a_small_png_that_declares_a_huge_size_is_rejected_before_decoding(
    monkeypatch,
):
    def fail(*args, **kwargs):
        raise AssertionError("no debía decodificar")

    monkeypatch.setattr(analysis.cv2, "imdecode", fail)
    # 8000×8000 son 64 millones de píxeles; el archivo pesa unos 200 KB.
    data = png(8000, 8000)
    assert len(data) < 1_000_000

    with pytest.raises(InvalidImage, match="demasiados píxeles"):
        analyzer().decode(data)


def test_a_header_that_lies_about_a_huge_size_is_rejected_without_the_pixels(
    monkeypatch,
):
    monkeypatch.setattr(
        analysis.cv2, "imdecode", lambda *a, **k: pytest.fail("no debía decodificar")
    )
    data = bytearray(png(10, 10))
    data[16:24] = struct.pack(">II", 100_000, 100_000)

    with pytest.raises(InvalidImage, match="demasiados píxeles"):
        analyzer().decode(bytes(data))


def test_an_image_within_the_limit_is_decoded_and_reduced():
    image = analyzer(max_side=100, max_pixels=1_000_000).decode(jpeg(400, 200))

    assert image.shape[:2] == (50, 100)


def test_the_limit_is_in_pixels_not_in_side():
    with pytest.raises(InvalidImage):
        analyzer(max_pixels=9999).decode(png(100, 100))
    assert analyzer(max_pixels=10_000).decode(png(100, 100)).shape[:2] == (100, 100)

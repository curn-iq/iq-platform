"""Las dimensiones de una imagen JPEG o PNG leídas del encabezado, sin decodificarla.

Sirve para rechazar por píxeles antes de que OpenCV reserve la matriz completa:
un PNG de un solo color de 8000×8000 pesa 200 KB y decodificado ocupa 192 MB.
"""

import struct

_PNG = b"\x89PNG\r\n\x1a\n"
# Marcadores de inicio de cuadro (SOF) de JPEG, los que traen alto y ancho.
_JPEG_SOF = frozenset({*range(0xC0, 0xC4), *range(0xC5, 0xC8), *range(0xC9, 0xCC)})
_JPEG_SOF |= {0xCD, 0xCE, 0xCF}


def image_size(data: bytes) -> tuple[int, int] | None:
    """(ancho, alto), o None si no es un JPEG o un PNG legible."""
    if data.startswith(_PNG):
        return _png_size(data)
    if data.startswith(b"\xff\xd8"):
        return _jpeg_size(data)
    return None


def _png_size(data: bytes) -> tuple[int, int] | None:
    # Firma (8) + longitud (4) + «IHDR» (4) + ancho (4) + alto (4)
    if len(data) < 24 or data[12:16] != b"IHDR":
        return None
    width, height = struct.unpack(">II", data[16:24])
    return width, height


def _jpeg_size(data: bytes) -> tuple[int, int] | None:
    position = 2
    end = len(data)
    while position + 4 <= end:
        if data[position] != 0xFF:
            return None
        marker = data[position + 1]
        if marker == 0xFF:  # relleno entre marcadores
            position += 1
            continue
        if marker in (0x01, *range(0xD0, 0xD9)):  # sin longitud
            position += 2
            continue
        (length,) = struct.unpack(">H", data[position + 2 : position + 4])
        if length < 2:
            return None
        if marker in _JPEG_SOF:
            if position + 9 > end:
                return None
            height, width = struct.unpack(">HH", data[position + 5 : position + 9])
            return width, height
        position += 2 + length
    return None

"""La mesa en la imagen: de los cuatro marcadores salen las coordenadas de la
mesa, sin importar qué tan torcido o alto esté el celular.

Los marcadores van uno en cada esquina de la mesa, encima del campo: 0 arriba a
la izquierda, 1 arriba a la derecha, 2 abajo a la derecha y 3 abajo a la
izquierda. Su centro marca la esquina de la mesa; la cuadrícula de cada técnica
se reparte en partes iguales entre ellos (las de DataIQ son diagramas hechos a
mano, no medidas).
"""

from collections.abc import Iterable

import numpy as np

from app.domain.vision import Marker

# Los ids de los marcadores, en el orden de las esquinas: arriba a la izquierda,
# arriba a la derecha, abajo a la derecha y abajo a la izquierda.
CORNER_IDS = (0, 1, 2, 3)
_CORNERS = ((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0))


class Board:
    """La homografía de la imagen a la mesa: (0, 0) es la esquina de arriba a la
    izquierda y (1, 1) la de abajo a la derecha, entre los centros de los
    marcadores. Con ella, el centro de la caja de un instrumento dice en qué
    parte de la mesa está."""

    def __init__(self, homography: np.ndarray) -> None:
        self._h = homography

    @classmethod
    def from_markers(cls, markers: Iterable[Marker]) -> Board | None:
        """None si no están los cuatro marcadores a la vez."""
        by_id = {m.id: m for m in markers}
        if not all(i in by_id for i in CORNER_IDS):
            return None
        source = [(by_id[i].x, by_id[i].y) for i in CORNER_IDS]
        rows, values = [], []
        for (x, y), (u, v) in zip(source, _CORNERS, strict=True):
            rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
            values.append(u)
            rows.append([0, 0, 0, x, y, 1, -v * x, -v * y])
            values.append(v)
        try:
            h = np.linalg.solve(np.array(rows, float), np.array(values, float))
        except np.linalg.LinAlgError:
            # Marcadores en línea o repetidos: no forman una mesa.
            return None
        return cls(np.append(h, 1.0).reshape(3, 3))

    def to_board(self, x: float, y: float) -> tuple[float, float]:
        """Un punto de la imagen en coordenadas de la mesa (puede salirse de 0 a
        1 si está fuera de los marcadores)."""
        u, v, w = self._h @ np.array([x, y, 1.0])
        return (float(u / w), float(v / w))

from dataclasses import dataclass


@dataclass(frozen=True)
class Box:
    """Una caja en píxeles de la imagen: esquina de arriba a la izquierda y
    esquina de abajo a la derecha."""

    x1: float
    y1: float
    x2: float
    y2: float

    @property
    def center(self) -> tuple[float, float]:
        return ((self.x1 + self.x2) / 2, (self.y1 + self.y2) / 2)


@dataclass(frozen=True)
class Detection:
    """Un instrumento que el modelo vio: su clase (el nombre del instrumento),
    dónde y con cuánta confianza."""

    label: str
    box: Box
    confidence: float


@dataclass(frozen=True)
class Marker:
    """Un marcador ArUco encontrado en la imagen, con el centro en píxeles."""

    id: int
    x: float
    y: float

import numpy as np

from app.domain.vision import Box, Detection


class YoloDetector:
    """Reconoce el instrumental con YOLO26 (Ultralytics, AGPL-3.0). Corre en CPU, sin
    GPU, sobre el cuadro reducido (README de SIVRI). El mapeo de clases a
    instrumentos se carga desde `classes.csv`.

    `ultralytics` se importa al cargar el modelo y no antes: sin él instalado
    (`uv sync --extra yolo`) SIVRI corre con el detector de pruebas.
    """

    def __init__(
        self,
        weights: str,
        confidence: float = 0.35,
        image_size: int = 640,
        device: str = "cpu",
        model=None,
        class_confidence: dict[str, float] | None = None,
    ) -> None:
        if model is None:
            from ultralytics import YOLO

            model = YOLO(weights)
        self._model = model
        self._confidence = confidence
        # Un umbral por instrumento (los que no están usan `confidence`): el modelo
        # predice con el más bajo y cada detección se filtra con el de su clase.
        self._class_confidence = class_confidence or {}
        self._image_size = image_size
        self._device = device

    def detect(self, image: np.ndarray) -> list[Detection]:
        result = self._model.predict(
            image,
            imgsz=self._image_size,
            conf=min([self._confidence, *self._class_confidence.values()]),
            device=self._device,
            verbose=False,
        )[0]
        names = result.names
        detections = []
        for box, cls, conf in zip(
            result.boxes.xyxy.tolist(),
            result.boxes.cls.tolist(),
            result.boxes.conf.tolist(),
            strict=True,
        ):
            label = names[int(cls)]
            if conf >= self._class_confidence.get(label, self._confidence):
                detections.append(Detection(label, Box(*box), float(conf)))
        return detections

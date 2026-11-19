import numpy as np

from app.domain.vision import Box, Detection


class YoloDetector:
    """Reconoce el instrumental con YOLO26 (Ultralytics, AGPL-3.0). Corre en CPU, sin
    GPU, sobre el cuadro reducido (README de SIVRI). Cada clase del modelo se llama
    como el instrumento del catálogo.

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
    ) -> None:
        if model is None:
            from ultralytics import YOLO

            model = YOLO(weights)
        self._model = model
        self._confidence = confidence
        self._image_size = image_size
        self._device = device

    def detect(self, image: np.ndarray) -> list[Detection]:
        result = self._model.predict(
            image,
            imgsz=self._image_size,
            conf=self._confidence,
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
            detections.append(Detection(names[int(cls)], Box(*box), float(conf)))
        return detections

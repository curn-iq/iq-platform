from app.adapters.outbound.vision.fake import FakeDetector
from app.config import Config
from app.ports.detector import Detector


def make_detector(config: Config) -> Detector:
    """El detector que pide la configuración (`DETECTOR`)."""
    if config.detector == "yolo":
        from app.adapters.outbound.vision.weights import verify_weights
        from app.adapters.outbound.vision.yolo import YoloDetector

        # Antes de que PyTorch los cargue: un `.pt` cambiado no debe llegar a `pickle`.
        verify_weights(config.model_path, config.model_sha256)
        return YoloDetector(
            config.model_path,
            config.confidence,
            config.image_size,
            config.device,
            class_confidence=config.class_confidence,
        )
    return FakeDetector.from_file(config.fake_detections)

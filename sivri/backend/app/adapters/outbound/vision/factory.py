from app.adapters.outbound.vision.fake import FakeDetector
from app.config import Config
from app.ports.detector import Detector


def make_detector(config: Config) -> Detector:
    """El detector que pide la configuración (`DETECTOR`)."""
    if config.detector == "yolo":
        from app.adapters.outbound.vision.yolo import YoloDetector

        return YoloDetector(
            config.model_path,
            config.confidence,
            config.image_size,
            config.device,
            class_confidence=config.class_confidence,
        )
    return FakeDetector.from_file(config.fake_detections)

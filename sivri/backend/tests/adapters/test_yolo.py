import numpy as np

from app.adapters.outbound.vision.fake import FakeDetector
from app.adapters.outbound.vision.yolo import YoloDetector
from app.domain.vision import Box, Detection


class _Tensor(list):
    def tolist(self):
        return list(self)


class FakeResult:
    names = {0: "Pinza Kelly", 1: "Pinza de Allis"}

    class boxes:
        xyxy = _Tensor([[10.0, 20.0, 110.0, 70.0], [200.0, 50.0, 260.0, 90.0]])
        cls = _Tensor([0.0, 1.0])
        conf = _Tensor([0.91, 0.55])


class FakeModel:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def predict(self, image, **options):
        self.calls.append(options)
        return [FakeResult()]


def test_yolo_turns_boxes_and_classes_into_detections_with_the_instrument_names():
    model = FakeModel()
    detector = YoloDetector("sivri.pt", 0.4, 512, "cpu", model=model)

    detections = detector.detect(np.zeros((100, 100, 3), np.uint8))

    assert detections == [
        Detection("Pinza Kelly", Box(10, 20, 110, 70), 0.91),
        Detection("Pinza de Allis", Box(200, 50, 260, 90), 0.55),
    ]
    assert model.calls == [
        {"imgsz": 512, "conf": 0.4, "device": "cpu", "verbose": False}
    ]


def test_the_fake_detector_gives_what_it_was_given_or_nothing():
    image = np.zeros((10, 10, 3), np.uint8)
    seen = [Detection("Pinza Kelly", Box(0, 0, 1, 1), 0.9)]

    assert FakeDetector(seen).detect(image) == seen
    assert FakeDetector().detect(image) == []
    assert FakeDetector.from_file("").detect(image) == []


def test_the_fake_detector_reads_its_detections_from_a_json_file(tmp_path):
    file = tmp_path / "d.json"
    file.write_text('[{"label": "Pinza Kelly", "box": [1, 2, 3, 4]}]', encoding="utf-8")

    detections = FakeDetector.from_file(str(file)).detect(np.zeros((1, 1, 3), np.uint8))

    assert detections == [Detection("Pinza Kelly", Box(1, 2, 3, 4), 0.9)]

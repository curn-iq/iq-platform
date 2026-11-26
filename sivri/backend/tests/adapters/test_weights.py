import hashlib
import logging

import pytest

from app.adapters.outbound.vision import weights as weights_module
from app.adapters.outbound.vision.factory import make_detector
from app.adapters.outbound.vision.weights import (
    WeightsMismatch,
    sha256_of,
    verify_weights,
)
from app.config import Config


@pytest.fixture
def weights(tmp_path):
    path = tmp_path / "sivri.pt"
    path.write_bytes(b"pesos de prueba" * 1000)
    return path


def test_the_sha256_is_the_one_of_the_file(weights):
    assert sha256_of(weights) == hashlib.sha256(weights.read_bytes()).hexdigest()


def test_matching_weights_pass_even_if_the_hash_is_written_in_capitals(weights):
    verify_weights(weights, sha256_of(weights).upper() + "\n")


def test_other_weights_are_refused(weights):
    with pytest.raises(WeightsMismatch, match="MODEL_SHA256"):
        verify_weights(weights, "0" * 64)


def test_a_changed_file_is_refused_after_it_was_good(weights):
    expected = sha256_of(weights)
    weights.write_bytes(weights.read_bytes() + b"x")

    with pytest.raises(WeightsMismatch):
        verify_weights(weights, expected)


def test_without_a_hash_it_only_warns(weights, caplog, monkeypatch):
    # Otra librería (logging.config con disable_existing_loggers) puede dejarlo
    # desactivado durante las pruebas.
    monkeypatch.setattr(logging.getLogger(weights_module.__name__), "disabled", False)
    with caplog.at_level(
        logging.WARNING, logger="app.adapters.outbound.vision.weights"
    ):
        verify_weights(weights, "")

    assert "MODEL_SHA256" in caplog.text


def test_yolo_is_not_built_with_other_weights(weights):
    config = Config(detector="yolo", model_path=str(weights), model_sha256="0" * 64)

    # Falla antes de importar ultralytics: los pesos ajenos nunca llegan a pickle.
    with pytest.raises(WeightsMismatch):
        make_detector(config)

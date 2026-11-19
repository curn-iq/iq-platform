import json
from datetime import UTC, datetime, timedelta

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app
from tests.api.conftest import ALLIS, KELLY, METZ, OTRA
from tests.api.frames import at, jpeg

URL = "/ws/validate"


@pytest.fixture
def web():
    # El cliente síncrono de Starlette: httpx no habla WebSocket.
    with TestClient(app, base_url="https://prueba") as c:
        yield c


def hello(ws, token: str) -> None:
    ws.send_text(json.dumps({"token": token}))


def closed_with(ws) -> int:
    with pytest.raises(WebSocketDisconnect) as closed:
        ws.receive_json()
    return closed.value.code


def test_a_frame_gets_its_result(web, setup, dataiq):
    setup.detections = [at(ALLIS, 0.5, 0.5), at(KELLY, 1.5, 2.5), at(METZ, 3.5, 1.0)]

    with web.websocket_connect(URL) as ws:
        hello(ws, dataiq.token())
        ws.send_bytes(jpeg())
        message = ws.receive_json()

    assert message["type"] == "result"
    frame = message["frame"]
    assert frame["board_found"] is True
    assert frame["techniques"][0]["name"] == "Prueba"
    assert frame["techniques"][0]["percent"] == 1.0


def test_it_keeps_answering_frame_after_frame_on_the_same_connection(
    web, setup, dataiq
):
    setup.detections = [at(ALLIS, 0.5, 0.5)]

    with web.websocket_connect(URL) as ws:
        hello(ws, dataiq.token())
        for _ in range(3):
            ws.send_bytes(jpeg())
            assert ws.receive_json()["type"] == "result"


def test_each_result_carries_the_number_of_its_frame(web, setup, dataiq):
    with web.websocket_connect(URL) as ws:
        hello(ws, dataiq.token())
        numbers = []
        for _ in range(3):
            ws.send_bytes(jpeg())
            numbers.append(ws.receive_json()["frame_number"])

    # Se envía un cuadro por vez, así que ninguno se descarta: 1, 2, 3.
    assert numbers == [1, 2, 3]


def test_a_failed_frame_still_counts_in_the_numbering(web, setup, dataiq):
    with web.websocket_connect(URL) as ws:
        hello(ws, dataiq.token())
        ws.send_bytes(b"no soy una imagen")
        assert ws.receive_json()["frame_number"] == 1
        ws.send_bytes(jpeg())
        assert ws.receive_json()["frame_number"] == 2


def test_with_a_technique_it_validates_only_that_one(web, setup, dataiq):
    with web.websocket_connect(f"{URL}?technique_id={OTRA.id}") as ws:
        hello(ws, dataiq.token())
        ws.send_bytes(jpeg())
        frame = ws.receive_json()["frame"]

    assert [t["name"] for t in frame["techniques"]] == ["Otra"]


def test_the_first_message_must_carry_the_token(web, setup):
    with web.websocket_connect(URL) as ws:
        ws.send_text("hola")
        assert closed_with(ws) == 4400


def test_an_invalid_token_closes_with_4401(web, setup):
    with web.websocket_connect(URL) as ws:
        hello(ws, "no-es-un-jwt")
        assert closed_with(ws) == 4401


def test_an_unknown_technique_closes_with_4404(web, setup, dataiq):
    from tests.api.conftest import uid

    with web.websocket_connect(f"{URL}?technique_id={uid('Inventada')}") as ws:
        hello(ws, dataiq.token())
        ws.send_bytes(jpeg())
        assert closed_with(ws) == 4404


def test_a_bad_frame_is_reported_and_the_connection_goes_on(web, setup, dataiq):
    with web.websocket_connect(URL) as ws:
        hello(ws, dataiq.token())
        ws.send_bytes(b"no soy una imagen")
        assert ws.receive_json() == {
            "type": "error",
            "code": "invalid_image",
            "frame_number": 1,
        }
        ws.send_bytes(jpeg())
        assert ws.receive_json()["type"] == "result"


def test_if_dataiq_is_down_it_says_so_and_goes_on(web, setup, dataiq):
    setup.catalog.error = setup.unavailable

    with web.websocket_connect(URL) as ws:
        hello(ws, dataiq.token())
        ws.send_bytes(jpeg())
        assert ws.receive_json() == {
            "type": "error",
            "code": "catalog_unavailable",
            "frame_number": 1,
        }
        setup.catalog.error = None
        ws.send_bytes(jpeg())
        assert ws.receive_json()["type"] == "result"


def test_if_dataiq_rejects_the_token_it_closes_with_4401(web, setup, dataiq):
    setup.catalog.error = setup.denied

    with web.websocket_connect(URL) as ws:
        hello(ws, dataiq.token())
        ws.send_bytes(jpeg())
        assert closed_with(ws) == 4401


def test_a_token_that_expires_without_renewal_is_reported_and_closed(
    web, setup, dataiq, monkeypatch
):
    # El token vence en 1 segundo; el cuadro llega después.
    soon = datetime.now(UTC) + timedelta(seconds=1)
    token = dataiq.token(exp=soon)

    with web.websocket_connect(URL) as ws:
        hello(ws, token)
        import time

        time.sleep(1.2)
        ws.send_bytes(jpeg())
        assert ws.receive_json() == {
            "type": "error",
            "code": "token_expired",
            "frame_number": 1,
        }
        assert closed_with(ws) == 4401


def test_a_renewed_token_keeps_the_connection_alive(web, setup, dataiq):
    import time

    soon = datetime.now(UTC) + timedelta(seconds=1)

    with web.websocket_connect(URL) as ws:
        hello(ws, dataiq.token(exp=soon))
        ws.send_bytes(jpeg())
        assert ws.receive_json()["type"] == "result"
        # La página renueva el token antes de que venza.
        renewed = dataiq.token()
        hello(ws, renewed)
        time.sleep(1.2)
        ws.send_bytes(jpeg())
        assert ws.receive_json()["type"] == "result"
    # Con el token renovado es con el que se pide el catálogo.
    assert setup.catalog.tokens[-1] == renewed


def test_an_invalid_renewal_is_reported_and_the_old_token_still_counts(
    web, setup, dataiq
):
    with web.websocket_connect(URL) as ws:
        hello(ws, dataiq.token())
        hello(ws, "no-es-un-jwt")
        assert ws.receive_json() == {"type": "error", "code": "invalid_token"}
        ws.send_bytes(jpeg())
        assert ws.receive_json()["type"] == "result"

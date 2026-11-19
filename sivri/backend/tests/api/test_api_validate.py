import pytest

from app.config import config
from tests.api.conftest import ALLIS, KELLY, METZ, OTRA, PRUEBA, uid
from tests.api.frames import at, jpeg


def send(client, headers, data=None, **params):
    return client.post(
        "/validate",
        headers=headers,
        params=params,
        files={"image": ("cuadro.jpg", jpeg() if data is None else data, "image/jpeg")},
    )


def a_correct_table():
    return [at(ALLIS, 0.5, 0.5), at(KELLY, 1.5, 2.5), at(METZ, 3.5, 1.0)]


@pytest.mark.anyio
async def test_it_needs_a_token(client):
    without = await send(client, {})
    invalid = await send(client, {"Authorization": "Bearer no-es-un-jwt"})

    assert without.status_code == 401
    assert invalid.status_code == 401


@pytest.mark.anyio
async def test_a_well_set_table_is_recognized_with_every_object_in_place(
    client, setup, bearer
):
    setup.detections = a_correct_table()

    response_ = await send(client, bearer)

    assert response_.status_code == 200
    body = response_.json()
    assert body["board_found"] is True
    assert [m["id"] for m in body["markers"]] == [0, 1, 2, 3]
    assert body["recognized"] is True
    assert [t["name"] for t in body["techniques"]] == ["Prueba"]
    result = body["techniques"][0]
    assert result["percent"] == 1.0
    assert {o["status"] for o in result["objects"]} == {"in_place"}
    assert [o["legend_number"] for o in result["objects"]] == [1, 2, 3]
    assert body["ranking"][0]["name"] == "Prueba"
    assert body["ranking"][1]["name"] == "Otra"
    # Cada detección dice qué instrumento de DataIQ es y dónde está, como fracción.
    kelly = next(d for d in body["detections"] if d["label"] == KELLY)
    assert kelly["instrument_id"] == str(uid(KELLY))
    assert 0 < kelly["box"]["x1"] < kelly["box"]["x2"] < 1


@pytest.mark.anyio
async def test_a_misplaced_instrument_says_how_many_cells_to_move_it(
    client, setup, bearer
):
    # La Kelly va en la fila 2, columna 3 y está una celda a la izquierda.
    setup.detections = [at(ALLIS, 0.5, 0.5), at(KELLY, 1.5, 1.5), at(METZ, 3.5, 1.0)]

    body = (await send(client, bearer)).json()

    kelly = next(o for o in body["techniques"][0]["objects"] if o["label"] == KELLY)
    assert kelly["status"] == "move"
    assert kelly["move"] == {"rows": 0, "columns": 1}
    assert kelly["found_cell"] == {"row": 2, "column": 2}
    assert kelly["expected_cells"] == [{"row": 2, "column": 3}]
    assert body["techniques"][0]["in_place"] == 2
    # Al estudiante se le dice la zona y el número del diagrama, no las celdas.
    assert kelly["message"] == "Pinza Kelly (n.º 2): va en el centro."
    in_place = next(o for o in body["techniques"][0]["objects"] if o["label"] == ALLIS)
    assert in_place["message"] is None


@pytest.mark.anyio
async def test_missing_and_extra_instruments_are_reported(client, setup, bearer):
    setup.detections = [
        at(ALLIS, 0.5, 0.5),
        at(METZ, 3.5, 1.0),
        at("Pinza Kocher", 2.5, 3.5),
    ]

    result = (await send(client, bearer)).json()["techniques"][0]

    statuses = {o["label"]: o["status"] for o in result["objects"]}
    assert statuses[KELLY] == "missing"
    assert [e["label"] for e in result["extras"]] == ["Pinza Kocher"]
    assert result["extras"][0]["status"] == "extra"
    kelly = next(o for o in result["objects"] if o["label"] == KELLY)
    assert kelly["message"] == "Falta Pinza Kelly (n.º 2): va en el centro."
    assert result["extras"][0]["message"] == "Sobra Pinza Kocher: no va en esta mesa."


@pytest.mark.anyio
async def test_without_the_four_markers_it_names_what_it_sees_but_does_not_validate(
    client, setup, bearer
):
    setup.detections = a_correct_table()

    body = (await send(client, bearer, jpeg(markers=(0, 1, 2)))).json()

    assert body["board_found"] is False
    assert body["techniques"] == [] and body["ranking"] == []
    assert body["recognized"] is False
    assert len(body["detections"]) == 3


@pytest.mark.anyio
async def test_with_a_technique_it_validates_only_that_one(client, setup, bearer):
    setup.detections = a_correct_table()

    body = (await send(client, bearer, technique_id=str(OTRA.id))).json()

    assert [t["name"] for t in body["techniques"]] == ["Otra"]
    assert [r["name"] for r in body["ranking"]] == ["Otra"]
    assert body["techniques"][0]["percent"] < 1.0


@pytest.mark.anyio
async def test_a_technique_it_does_not_validate_is_404(client, bearer):
    response_ = await send(client, bearer, technique_id=str(uid("Inventada")))

    assert response_.status_code == 404


@pytest.mark.anyio
@pytest.mark.parametrize("data", [b"", b"no soy una imagen"])
async def test_a_file_that_is_not_an_image_is_422(client, bearer, data):
    response_ = await send(client, bearer, data=data)

    assert response_.status_code == 422


@pytest.mark.anyio
async def test_too_large_an_image_is_413(client, bearer, monkeypatch):
    monkeypatch.setattr(config, "max_upload_bytes", 100)

    response_ = await send(client, bearer)

    assert response_.status_code == 413


@pytest.mark.anyio
async def test_it_asks_dataiq_with_the_callers_token(client, setup, dataiq):
    token = dataiq.token()

    await send(client, {"Authorization": f"Bearer {token}"})

    assert setup.catalog.tokens == [token]


@pytest.mark.anyio
async def test_if_dataiq_does_not_respond_it_is_503(client, setup, bearer):
    setup.catalog.error = setup.unavailable

    assert (await send(client, bearer)).status_code == 503


@pytest.mark.anyio
async def test_if_dataiq_rejects_the_token_it_is_401(client, setup, bearer):
    setup.catalog.error = setup.denied

    assert (await send(client, bearer)).status_code == 401


@pytest.mark.anyio
async def test_the_techniques_it_validates_with_how_many_instruments_each_expects(
    client, bearer
):
    response_ = await client.get("/techniques", headers=bearer)

    assert response_.status_code == 200
    assert {t["name"]: t["expected"] for t in response_.json()} == {
        PRUEBA.name: 3,
        OTRA.name: 3,
    }

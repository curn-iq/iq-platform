import pytest

from app.adaptadores.salida.persistencia.repositorios.versiones import (
    RepositorioVersionesSQLAlchemy,
)
from app.dominio.errores import Conflicto
from app.dominio.tecnicas import EstadoVersion
from app.dominio.usuarios import RolUsuario
from tests.conftest import cabeceras, guardar_usuario


async def crear_tecnica(cliente, cuenta, especialidad, nombre="Técnica nueva") -> dict:
    respuesta = await cliente.post(
        "/tecnicas",
        json={"nombre": nombre, "especialidad_id": str(especialidad.id)},
        headers=cabeceras(cuenta),
    )
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()["resumen"]


def contenido(zona, instrumento, **cambios) -> dict:
    return {
        "anestesia": "General",
        "items": [
            {
                "zona_id": str(zona.id),
                "numero_leyenda": 1,
                "texto_fuente": "Pinza",
                "componentes": [{"instrumental_id": str(instrumento.id)}],
                "celdas": [{"fila": 1, "columna": 1}, {"fila": 1, "columna": 2}],
            },
            {"texto_fuente": "Solo del listado"},
        ],
        "suturas": [{"nombre": "Seda", "calibre": "3/0", "uso": "Piel"}],
        "equipos": ["Electrobisturí"],
        "dispositivos": ["Sonda"],
    } | cambios


async def editar(cliente, cuenta, version_id, cuerpo):
    return await cliente.put(
        f"/versiones/{version_id}", json=cuerpo, headers=cabeceras(cuenta)
    )


async def accion(cliente, cuenta, version_id, nombre, **kwargs):
    return await cliente.post(
        f"/versiones/{version_id}/{nombre}", headers=cabeceras(cuenta), **kwargs
    )


@pytest.mark.anyio
async def test_ciclo_de_un_colaborador_hasta_publicar(
    cliente, colaborador, revisor, especialidad, zona, instrumento
):
    version = await crear_tecnica(cliente, colaborador, especialidad)
    assert (version["estado"], version["numero"]) == ("borrador", 1)

    editada = await editar(
        cliente, colaborador, version["id"], contenido(zona, instrumento)
    )
    assert editada.status_code == 200, editada.text
    detalle = editada.json()["contenido"]
    assert detalle["anestesia"] == "General"
    assert [i["texto_fuente"] for i in detalle["items"]] == [
        "Pinza",
        "Solo del listado",
    ]
    assert detalle["items"][0]["celdas"] == [
        {"fila": 1, "columna": 1},
        {"fila": 1, "columna": 2},
    ]
    assert [s["uso"] for s in detalle["suturas"]] == ["Piel"]

    assert (
        await accion(cliente, colaborador, version["id"], "enviar")
    ).status_code == 204
    # En revisión ya no se edita
    bloqueada = await editar(
        cliente, colaborador, version["id"], contenido(zona, instrumento)
    )
    assert bloqueada.status_code == 409

    rechazo = await accion(
        cliente, revisor, version["id"], "rechazar", json={"motivo": "Falta la ropa"}
    )
    assert rechazo.status_code == 204
    devuelta = await cliente.get(
        f"/versiones/{version['id']}", headers=cabeceras(colaborador)
    )
    assert devuelta.json()["resumen"]["estado"] == "borrador"
    assert [r["motivo"] for r in devuelta.json()["rechazos"]] == ["Falta la ropa"]

    corregida = contenido(zona, instrumento, ropa="Campos estériles")
    assert (
        await editar(cliente, colaborador, version["id"], corregida)
    ).status_code == 200
    assert (
        await accion(cliente, colaborador, version["id"], "enviar")
    ).status_code == 204
    assert (await accion(cliente, revisor, version["id"], "aprobar")).status_code == 204

    publicadas = (await cliente.get("/tecnicas")).json()
    assert [t["nombre"] for t in publicadas] == ["Técnica nueva"]
    instrumental = await cliente.get(
        f"/tecnicas/{version['tecnica_id']}/instrumental",
        headers=cabeceras(colaborador),
    )
    assert len(instrumental.json()["items"]) == 2


@pytest.mark.anyio
async def test_un_colaborador_nunca_publica(
    cliente, colaborador, especialidad, zona, instrumento
):
    version = await crear_tecnica(cliente, colaborador, especialidad)

    directo = await accion(cliente, colaborador, version["id"], "publicar")
    await accion(cliente, colaborador, version["id"], "enviar")
    aprobado = await accion(cliente, colaborador, version["id"], "aprobar")

    assert directo.status_code == 403
    assert aprobado.status_code == 403


@pytest.mark.anyio
async def test_un_revisor_publica_lo_suyo_sin_revision(cliente, revisor, especialidad):
    version = await crear_tecnica(cliente, revisor, especialidad)

    respuesta = await accion(cliente, revisor, version["id"], "publicar")

    assert respuesta.status_code == 204
    assert [t["nombre"] for t in (await cliente.get("/tecnicas")).json()] == [
        "Técnica nueva"
    ]


@pytest.mark.anyio
async def test_si_otro_revisor_ya_decidio_responde_409(
    cliente, colaborador, revisor, otro_revisor, especialidad
):
    version = await crear_tecnica(cliente, colaborador, especialidad)
    await accion(cliente, colaborador, version["id"], "enviar")
    await accion(cliente, revisor, version["id"], "aprobar")

    otra_aprobacion = await accion(cliente, otro_revisor, version["id"], "aprobar")
    otro_rechazo = await accion(
        cliente, otro_revisor, version["id"], "rechazar", json={"motivo": "Tarde"}
    )

    assert otra_aprobacion.status_code == 409
    assert otro_rechazo.status_code == 409


@pytest.mark.anyio
async def test_el_repositorio_revisa_el_estado_con_la_fila_bloqueada(
    sesion, cliente, colaborador, revisor, especialidad
):
    # Dos revisores leyeron "en_revision" a la vez; el segundo llega tarde.
    version = await crear_tecnica(cliente, colaborador, especialidad)
    await accion(cliente, colaborador, version["id"], "enviar")
    await accion(cliente, revisor, version["id"], "aprobar")
    repositorio = RepositorioVersionesSQLAlchemy(sesion)

    with pytest.raises(Conflicto):
        await repositorio.cambiar_estado(
            version["id"],
            EstadoVersion.en_revision,
            EstadoVersion.publicada,
            revisor.id,
        )


@pytest.mark.anyio
async def test_rechazar_pide_motivo(cliente, colaborador, revisor, especialidad):
    version = await crear_tecnica(cliente, colaborador, especialidad)
    await accion(cliente, colaborador, version["id"], "enviar")

    respuesta = await accion(
        cliente, revisor, version["id"], "rechazar", json={"motivo": "   "}
    )

    assert respuesta.status_code == 422


@pytest.mark.anyio
async def test_editar_una_publicada_copia_su_contenido_en_una_version_nueva(
    cliente, revisor, especialidad, zona, instrumento
):
    v1 = await crear_tecnica(cliente, revisor, especialidad)
    await editar(cliente, revisor, v1["id"], contenido(zona, instrumento))
    await accion(cliente, revisor, v1["id"], "publicar")

    nueva = await cliente.post(
        f"/tecnicas/{v1['tecnica_id']}/versiones", headers=cabeceras(revisor)
    )
    otra_mas = await cliente.post(
        f"/tecnicas/{v1['tecnica_id']}/versiones", headers=cabeceras(revisor)
    )

    assert nueva.status_code == 201
    assert otra_mas.status_code == 409  # ya hay una versión en curso
    v2 = nueva.json()
    assert (v2["resumen"]["numero"], v2["resumen"]["estado"]) == (2, "borrador")
    copia = v2["contenido"]
    assert copia["anestesia"] == "General"
    assert [i["texto_fuente"] for i in copia["items"]] == ["Pinza", "Solo del listado"]
    assert len(copia["items"][0]["celdas"]) == 2
    assert [e["nombre"] for e in copia["equipos"]] == ["Electrobisturí"]

    await accion(cliente, revisor, v2["resumen"]["id"], "publicar")
    publicada = (await cliente.get(f"/tecnicas/{v1['tecnica_id']}")).json()
    anterior = await cliente.get(f"/versiones/{v1['id']}", headers=cabeceras(revisor))
    assert publicada["numero_version"] == 2
    assert anterior.json()["resumen"]["estado"] == "reemplazada"


@pytest.mark.anyio
async def test_solo_quien_creo_la_version_la_edita_y_un_colaborador_solo_ve_lo_suyo(
    sesion, cliente, colaborador, revisor, especialidad, zona, instrumento
):
    otra = await guardar_usuario(
        sesion, "Otra", "otra@prueba.com", RolUsuario.colaborador
    )
    version = await crear_tecnica(cliente, colaborador, especialidad)

    ajena = await editar(cliente, otra, version["id"], contenido(zona, instrumento))
    vista_ajena = await cliente.get(
        f"/versiones/{version['id']}", headers=cabeceras(otra)
    )
    vista_revisor = await cliente.get(
        f"/versiones/{version['id']}", headers=cabeceras(revisor)
    )
    lista_otra = await cliente.get("/versiones", headers=cabeceras(otra))
    lista_revisor = await cliente.get("/versiones", headers=cabeceras(revisor))

    assert ajena.status_code == 403
    assert vista_ajena.status_code == 403
    assert vista_revisor.status_code == 200
    assert lista_otra.json() == []
    assert [v["id"] for v in lista_revisor.json()] == [version["id"]]


@pytest.mark.anyio
async def test_un_usuario_no_escribe(cliente, usuario, especialidad):
    respuesta = await cliente.post(
        "/tecnicas",
        json={"nombre": "Técnica", "especialidad_id": str(especialidad.id)},
        headers=cabeceras(usuario),
    )

    assert respuesta.status_code == 403


@pytest.mark.anyio
async def test_no_se_repite_una_tecnica_en_la_misma_especialidad(
    cliente, colaborador, especialidad
):
    await crear_tecnica(cliente, colaborador, especialidad)

    respuesta = await cliente.post(
        "/tecnicas",
        json={"nombre": "Técnica nueva", "especialidad_id": str(especialidad.id)},
        headers=cabeceras(colaborador),
    )

    assert respuesta.status_code == 409


@pytest.mark.anyio
async def test_editar_con_una_mesa_invalida_dice_que_esta_mal(
    cliente, colaborador, especialidad, zona, instrumento
):
    version = await crear_tecnica(cliente, colaborador, especialidad)
    repetida = contenido(zona, instrumento)
    repetida["items"].append(repetida["items"][0])
    fantasma = contenido(zona, instrumento)
    fantasma["items"][0]["componentes"] = [
        {"instrumental_id": "01a10317-0000-7000-8000-000000000000"}
    ]

    con_repetido = await editar(cliente, colaborador, version["id"], repetida)
    con_fantasma = await editar(cliente, colaborador, version["id"], fantasma)

    assert con_repetido.status_code == 422
    assert "El número 1 está repetido en la misma mesa" in con_repetido.json()["detail"]
    assert con_fantasma.status_code == 422
    assert con_fantasma.json()["detail"] == [
        "No existe el instrumento 01a10317-0000-7000-8000-000000000000"
    ]


@pytest.mark.anyio
async def test_archivar_retira_la_tecnica_pero_no_con_una_version_en_curso(
    cliente, revisor, colaborador, especialidad
):
    v1 = await crear_tecnica(cliente, revisor, especialidad)
    await accion(cliente, revisor, v1["id"], "publicar")
    tecnica = v1["tecnica_id"]

    sin_permiso = await cliente.post(
        f"/tecnicas/{tecnica}/archivar", headers=cabeceras(colaborador)
    )
    await cliente.post(f"/tecnicas/{tecnica}/versiones", headers=cabeceras(colaborador))
    con_version_en_curso = await cliente.post(
        f"/tecnicas/{tecnica}/archivar", headers=cabeceras(revisor)
    )

    assert sin_permiso.status_code == 403
    assert con_version_en_curso.status_code == 409


@pytest.mark.anyio
async def test_archivar_quita_la_tecnica_del_catalogo(cliente, revisor, especialidad):
    v1 = await crear_tecnica(cliente, revisor, especialidad)
    await accion(cliente, revisor, v1["id"], "publicar")

    respuesta = await cliente.post(
        f"/tecnicas/{v1['tecnica_id']}/archivar", headers=cabeceras(revisor)
    )

    assert respuesta.status_code == 204
    assert (await cliente.get("/tecnicas")).json() == []
    assert (await cliente.get(f"/tecnicas/{v1['tecnica_id']}")).status_code == 404

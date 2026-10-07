import jwt
import pytest

from tests.conftest import cabeceras

REGISTRO = {
    "nombre": "Ana",
    "email": "Ana@Prueba.com",
    "contrasena": "una-contraseña-larga",
    "acepta_politica": True,
}


async def registrar_e_ingresar(cliente) -> str:
    await cliente.post("/auth/registro", json=REGISTRO)
    respuesta = await cliente.post(
        "/auth/login",
        data={"username": "ana@prueba.com", "password": REGISTRO["contrasena"]},
    )
    return respuesta.json()["access_token"]


@pytest.mark.anyio
async def test_registro_crea_una_cuenta_con_rol_usuario(cliente):
    respuesta = await cliente.post("/auth/registro", json=REGISTRO)

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["email"] == "ana@prueba.com"
    assert cuerpo["rol"] == "usuario"
    assert "contrasena" not in cuerpo


@pytest.mark.anyio
async def test_registro_rechaza_un_correo_repetido(cliente):
    await cliente.post("/auth/registro", json=REGISTRO)

    respuesta = await cliente.post(
        "/auth/registro", json=REGISTRO | {"email": "ANA@prueba.com"}
    )

    assert respuesta.status_code == 409


@pytest.mark.anyio
@pytest.mark.parametrize(
    "cambio",
    [{"acepta_politica": False}, {"contrasena": "corta"}, {"email": "no-es-correo"}],
)
async def test_registro_valida_politica_contrasena_y_correo(cliente, cambio):
    respuesta = await cliente.post("/auth/registro", json=REGISTRO | cambio)

    assert respuesta.status_code == 422


@pytest.mark.anyio
async def test_login_devuelve_un_token_que_sirve(cliente):
    token = await registrar_e_ingresar(cliente)

    respuesta = await cliente.get(
        "/auth/yo", headers={"Authorization": f"Bearer {token}"}
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Ana"
    assert respuesta.headers["cache-control"] == "private, max-age=0"


@pytest.mark.anyio
@pytest.mark.parametrize(
    "credenciales",
    [
        {"username": "ana@prueba.com", "password": "otra-contraseña"},
        {"username": "nadie@prueba.com", "password": "una-contraseña-larga"},
    ],
)
async def test_login_falla_con_datos_incorrectos(cliente, credenciales):
    await cliente.post("/auth/registro", json=REGISTRO)

    respuesta = await cliente.post("/auth/login", data=credenciales)

    assert respuesta.status_code == 401
    assert respuesta.json()["detail"] == "Correo o contraseña incorrectos"


@pytest.mark.anyio
async def test_sin_token_o_con_un_token_falso_responde_401(cliente):
    assert (await cliente.get("/auth/yo")).status_code == 401
    falso = {"Authorization": "Bearer no.es.token"}
    assert (await cliente.get("/auth/yo", headers=falso)).status_code == 401


@pytest.mark.anyio
async def test_otro_modulo_valida_el_token_solo_con_la_clave_publica(
    cliente, colaborador
):
    token = cabeceras(colaborador)["Authorization"].removeprefix("Bearer ")

    jwks = (await cliente.get("/.well-known/jwks.json")).json()
    clave = jwt.PyJWKSet.from_dict(jwks).keys[0]
    datos = jwt.decode(token, clave.key, algorithms=["EdDSA"], audience="iq-platform")

    assert jwks["keys"][0]["kty"] == "OKP"
    assert "d" not in jwks["keys"][0]  # la parte privada nunca se publica
    assert datos["sub"] == str(colaborador.id)
    assert datos["rol"] == "colaborador"

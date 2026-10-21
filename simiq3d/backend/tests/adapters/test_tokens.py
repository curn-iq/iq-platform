from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from app.adapters.outbound.security.tokens import JWKSVerifier
from app.ports.security import InvalidToken, KeysUnavailable
from tests.conftest import JWKS_URL

ACCOUNT_ID = "0199e0d4-7f2a-7cc1-9b5e-3f1d2a4b5c6d"


@pytest.mark.anyio
async def test_a_dataiq_token_gives_the_account_id(verifier, dataiq):
    account_id = await verifier.verify(dataiq.token(sub=ACCOUNT_ID))

    assert account_id == UUID(ACCOUNT_ID)


@pytest.mark.anyio
@pytest.mark.parametrize(
    "claims",
    [
        {"exp": datetime.now(UTC) - timedelta(minutes=1)},
        {"aud": "otro-sistema"},
        {"iss": "otro-emisor"},
        {"sub": "no-es-un-uuid"},
    ],
    ids=["vencido", "otra-audiencia", "otro-emisor", "sub-invalido"],
)
async def test_tokens_that_are_not_for_the_ecosystem_are_rejected(
    verifier, dataiq, claims
):
    with pytest.raises(InvalidToken):
        await verifier.verify(dataiq.token(**claims))


@pytest.mark.anyio
async def test_a_token_signed_with_another_key_is_rejected(verifier, dataiq):
    # Mismo kid que la clave de DataIQ, pero firmado con otra clave privada.
    forged = jwt.encode(
        {"sub": ACCOUNT_ID, "iss": "dataiq", "aud": "iq-platform"},
        Ed25519PrivateKey.generate(),
        algorithm="EdDSA",
        headers={"kid": "clave-1"},
    )

    with pytest.raises(InvalidToken):
        await verifier.verify(forged)


@pytest.mark.anyio
async def test_a_token_with_a_shared_secret_is_rejected(verifier, dataiq):
    # HS256 con un secreto: el ataque de confusión de algoritmo no pasa.
    hs256 = jwt.encode(
        {"sub": ACCOUNT_ID, "iss": "dataiq", "aud": "iq-platform"},
        "un-secreto-cualquiera-de-32-bytes",
        algorithm="HS256",
        headers={"kid": "clave-1"},
    )

    with pytest.raises(InvalidToken):
        await verifier.verify(hs256)


@pytest.mark.anyio
async def test_garbage_is_not_a_token(verifier):
    with pytest.raises(InvalidToken):
        await verifier.verify("esto-no-es-un-jwt")


@pytest.mark.anyio
async def test_the_keys_are_asked_once_and_kept(verifier, dataiq):
    for _ in range(3):
        await verifier.verify(dataiq.token())

    assert dataiq.jwks_requests == 1


@pytest.mark.anyio
async def test_a_new_dataiq_key_is_fetched_when_a_token_uses_it(dataiq):
    verifier = JWKSVerifier(
        JWKS_URL, "dataiq", "iq-platform", min_interval=0, transport=dataiq.transport()
    )
    await verifier.verify(dataiq.token())

    new_kid = dataiq.add_key()
    await verifier.verify(dataiq.token(kid=new_kid))

    assert dataiq.jwks_requests == 2


@pytest.mark.anyio
async def test_unknown_keys_do_not_flood_dataiq(verifier, dataiq):
    await verifier.verify(dataiq.token())
    stranger = FakeKey()

    for _ in range(5):
        with pytest.raises(InvalidToken):
            await verifier.verify(stranger.token())

    # Dentro del intervalo mínimo no se vuelve a pedir el JWKS.
    assert dataiq.jwks_requests == 1


@pytest.mark.anyio
async def test_without_dataiq_and_without_keys_the_session_cannot_be_checked(
    verifier, dataiq
):
    dataiq.down = True

    with pytest.raises(KeysUnavailable):
        await verifier.verify(dataiq.token())


@pytest.mark.anyio
async def test_if_dataiq_goes_down_the_known_keys_still_work(dataiq):
    verifier = JWKSVerifier(
        JWKS_URL, "dataiq", "iq-platform", max_age=0, transport=dataiq.transport()
    )
    await verifier.verify(dataiq.token())
    dataiq.down = True

    # Las claves ya están viejas (max_age=0) y DataIQ no responde: se usan las
    # que había.
    account_id = await verifier.verify(dataiq.token(sub=ACCOUNT_ID))

    assert account_id == UUID(ACCOUNT_ID)


class FakeKey:
    """Una clave que DataIQ no publica."""

    def __init__(self) -> None:
        self._key = Ed25519PrivateKey.generate()

    def token(self) -> str:
        return jwt.encode(
            {"sub": ACCOUNT_ID, "iss": "dataiq", "aud": "iq-platform"},
            self._key,
            algorithm="EdDSA",
            headers={"kid": "clave-desconocida"},
        )

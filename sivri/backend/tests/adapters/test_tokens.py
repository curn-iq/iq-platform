from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from app.ports.security import InvalidToken, KeysUnavailable

ACCOUNT_ID = "0199e0d4-7f2a-7cc1-9b5e-3f1d2a4b5c6d"


@pytest.mark.anyio
async def test_a_short_dataiq_token_gives_the_account_and_when_it_expires(
    verifier, dataiq
):
    expires = datetime.now(UTC).replace(microsecond=0) + timedelta(minutes=5)

    principal = await verifier.verify(dataiq.token(sub=ACCOUNT_ID, exp=expires))

    assert principal.account_id == UUID(ACCOUNT_ID)
    assert principal.expires_at == expires


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
        await verifier.verify("no-es-un-jwt")


@pytest.mark.anyio
async def test_without_the_dataiq_keys_there_is_no_way_to_know(verifier, dataiq):
    dataiq.down = True

    with pytest.raises(KeysUnavailable):
        await verifier.verify(dataiq.token())


@pytest.mark.anyio
async def test_keys_are_kept_and_an_unknown_kid_is_asked_for_at_most_once_a_minute(
    verifier, dataiq
):
    await verifier.verify(dataiq.token())
    await verifier.verify(dataiq.token())
    assert dataiq.jwks_requests == 1

    for _ in range(3):
        with pytest.raises(InvalidToken):
            await verifier.verify(
                jwt.encode(
                    {"sub": ACCOUNT_ID},
                    Ed25519PrivateKey.generate(),
                    algorithm="EdDSA",
                    headers={"kid": "inventada"},
                )
            )
    assert dataiq.jwks_requests == 1

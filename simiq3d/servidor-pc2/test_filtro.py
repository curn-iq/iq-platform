# /// script
# requires-python = ">=3.12"
# dependencies = ["starlette>=0.48", "uvicorn>=0.37", "httpx>=0.28", "pytest>=8", "anyio>=4"]
# ///
"""Pruebas del filtro: uv run --script test_filtro.py"""

import asyncio
import json

import httpx
import pytest

from filtro import create_app

KEY = "k" * 40
CHAT = {"model": "qwen3-vl:8b-instruct", "messages": [{"role": "user", "content": "Hola"}]}


class FakeOllama:
    def __init__(self) -> None:
        self.bodies: list[dict] = []

    def transport(self) -> httpx.MockTransport:
        def handle(request: httpx.Request) -> httpx.Response:
            self.bodies.append(json.loads(request.content))
            return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

        return httpx.MockTransport(handle)


@pytest.fixture
def ollama():
    return FakeOllama()


@pytest.fixture
async def client(ollama):
    app = create_app(KEY, {"qwen3-vl:8b-instruct"}, "http://ollama", ollama.transport())
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://pc2"
    ) as c:
        yield c


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_with_the_key_the_chat_reaches_ollama(client, ollama):
    response = await client.post(
        "/v1/chat/completions", json=CHAT, headers={"Authorization": f"Bearer {KEY}"}
    )

    assert response.status_code == 200
    assert ollama.bodies[0]["stream"] is False


@pytest.mark.anyio
@pytest.mark.parametrize(
    "header", [{}, {"Authorization": "Bearer otra-clave"}, {"Authorization": KEY}]
)
async def test_without_the_key_nothing_reaches_ollama(client, ollama, header):
    response = await client.post("/v1/chat/completions", json=CHAT, headers=header)

    assert response.status_code == 401
    assert ollama.bodies == []


@pytest.mark.anyio
async def test_only_the_configured_model_is_allowed(client, ollama):
    response = await client.post(
        "/v1/chat/completions",
        json=CHAT | {"model": "llama3:70b"},
        headers={"Authorization": f"Bearer {KEY}"},
    )

    assert response.status_code == 403


@pytest.mark.anyio
async def test_other_ollama_routes_are_not_published(client):
    for method, path in (("GET", "/api/tags"), ("POST", "/api/pull"), ("POST", "/api/generate")):
        response = await client.request(method, path, headers={"Authorization": f"Bearer {KEY}"})
        assert response.status_code in (404, 405)


@pytest.mark.anyio
async def test_huge_requests_are_rejected(client):
    big = CHAT | {"messages": [{"role": "user", "content": "x" * 300_000}]}

    response = await client.post(
        "/v1/chat/completions", json=big, headers={"Authorization": f"Bearer {KEY}"}
    )

    assert response.status_code == 413


@pytest.mark.anyio
async def test_health_answers_without_the_key(client):
    assert (await client.get("/salud")).json() == {"ok": True}


@pytest.mark.anyio
async def test_when_it_is_full_it_says_busy_at_once():
    release = asyncio.Event()

    def slow(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={})

    class Waiting(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request):
            await release.wait()
            return slow(request)

    app = create_app(KEY, {"qwen3-vl:8b-instruct"}, "http://ollama", Waiting(), at_once=1)
    headers = {"Authorization": f"Bearer {KEY}"}
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://pc2"
    ) as c:
        first = asyncio.create_task(c.post("/v1/chat/completions", json=CHAT, headers=headers))
        await asyncio.sleep(0.05)
        second = await c.post("/v1/chat/completions", json=CHAT, headers=headers)
        release.set()
        assert (await first).status_code == 200
    assert second.status_code == 429


def test_a_short_key_is_refused():
    with pytest.raises(ValueError):
        create_app("corta", {"qwen3-vl:8b-instruct"})


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q", "-p", "no:cacheprovider"]))

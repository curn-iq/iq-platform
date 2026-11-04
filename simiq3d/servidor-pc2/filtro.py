# /// script
# requires-python = ">=3.12"
# dependencies = ["starlette>=0.48", "uvicorn>=0.37", "httpx>=0.28"]
# ///
"""Filtro con clave del Servidor PC2: lo único que Tailscale Funnel publica.

Ollama no tiene autenticación, así que no se expone. Este filtro escucha en
127.0.0.1, exige la clave que solo conoce el backend de SIMIQ3D (Authorization:
Bearer) y reenvía a Ollama solo lo que el chat usa: POST /v1/chat/completions,
con el modelo configurado y un tamaño máximo. Así, quien descubra la dirección
pública no puede usar la GPU para otra cosa.

    FILTRO_CLAVE=... uv run filtro.py        # http://127.0.0.1:11435

Variables: FILTRO_CLAVE (obligatoria), FILTRO_MODELOS (separados por coma; por
defecto qwen3-vl:8b-instruct), FILTRO_SIMULTANEAS (cuántas preguntas atiende a
la vez; por defecto 2), OLLAMA_URL (por defecto http://127.0.0.1:11434),
FILTRO_PUERTO (por defecto 11435).

Si ya está atendiendo FILTRO_SIMULTANEAS, responde 429 al momento en vez de
hacer fila: el backend responde entonces con lo que tiene DataIQ, y nadie
espera minutos a que la GPU se desocupe.

Con `"stream": true` (el chat de SIMIQ3D, para mostrar la respuesta frase por
frase) reenvía las partes de Ollama a medida que llegan; el lugar se ocupa
hasta que termina la respuesta.
"""

import asyncio
import json
import os
import secrets

import httpx
import uvicorn
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse
from starlette.routing import Route

MAX_BYTES = 256 * 1024


def create_app(
    key: str,
    models: set[str],
    ollama_url: str = "http://127.0.0.1:11434",
    transport: httpx.AsyncBaseTransport | None = None,
    at_once: int = 2,
) -> Starlette:
    if len(key) < 32:
        raise ValueError("FILTRO_CLAVE debe tener al menos 32 caracteres")
    slots = asyncio.Semaphore(at_once)

    async def health(request: Request) -> Response:
        # Para saber desde fuera si el Servidor PC2 está prendido; no revela nada.
        return JSONResponse({"ok": True})

    async def chat(request: Request) -> Response:
        sent = request.headers.get("authorization", "")
        if not secrets.compare_digest(sent.encode(), f"Bearer {key}".encode()):
            return JSONResponse({"error": "Clave no válida"}, status_code=401)
        body = await request.body()
        if len(body) > MAX_BYTES:
            return JSONResponse({"error": "Petición muy grande"}, status_code=413)
        try:
            data = json.loads(body)
        except ValueError:
            return JSONResponse({"error": "JSON no válido"}, status_code=400)
        if not isinstance(data, dict) or data.get("model") not in models:
            return JSONResponse({"error": "Modelo no permitido"}, status_code=403)
        stream = data.get("stream") is True
        data["stream"] = stream
        if slots.locked():
            return JSONResponse({"error": "Servidor ocupado"}, status_code=429)
        if stream:
            return await _streamed(data)
        async with slots, httpx.AsyncClient(transport=transport, timeout=180) as client:
            try:
                answer = await client.post(f"{ollama_url}/v1/chat/completions", json=data)
            except httpx.HTTPError:
                return JSONResponse({"error": "Ollama no responde"}, status_code=502)
        return Response(
            answer.content,
            status_code=answer.status_code,
            media_type="application/json",
        )

    async def _streamed(data: dict) -> Response:
        """Las partes de la respuesta de Ollama, a medida que llegan. El lugar
        y la conexión se sueltan cuando termina, o si el backend se va."""
        await slots.acquire()
        client = httpx.AsyncClient(transport=transport, timeout=180)
        try:
            upstream = await client.send(
                client.build_request("POST", f"{ollama_url}/v1/chat/completions", json=data),
                stream=True,
            )
        except httpx.HTTPError:
            await client.aclose()
            slots.release()
            return JSONResponse({"error": "Ollama no responde"}, status_code=502)

        async def parts():
            try:
                async for chunk in upstream.aiter_raw():
                    yield chunk
            finally:
                await upstream.aclose()
                await client.aclose()
                slots.release()

        return StreamingResponse(
            parts(),
            status_code=upstream.status_code,
            media_type=upstream.headers.get("content-type", "text/event-stream"),
        )

    return Starlette(
        routes=[
            Route("/salud", health, methods=["GET"]),
            Route("/v1/chat/completions", chat, methods=["POST"]),
        ]
    )


if __name__ == "__main__":
    app = create_app(
        os.environ["FILTRO_CLAVE"],
        {m.strip() for m in os.environ.get("FILTRO_MODELOS", "qwen3-vl:8b-instruct").split(",")},
        os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434"),
        at_once=int(os.environ.get("FILTRO_SIMULTANEAS", "2")),
    )
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("FILTRO_PUERTO", "11435")))

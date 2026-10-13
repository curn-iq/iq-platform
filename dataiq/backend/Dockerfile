# Imagen de la API de DataIQ para Cloud Run. Compatible con Docker y Podman.
#
# Dos etapas: la primera instala las dependencias con uv; la segunda solo
# copia el entorno ya armado, sin uv ni cachés, y corre sin root.

FROM python:3.14-slim AS build

COPY --from=ghcr.io/astral-sh/uv:0.12.18 /uv /bin/uv

# Bytecode compilado (arranque en frío más rápido) y el Python de la imagen,
# no uno descargado por uv.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

# Primero solo las dependencias: esta capa se reutiliza mientras no cambie
# uv.lock, aunque cambie el código.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app


FROM python:3.14-slim

RUN useradd --create-home --uid 1000 dataiq
WORKDIR /app
COPY --from=build --chown=dataiq:dataiq /app /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

USER dataiq

# Cloud Run indica el puerto en $PORT (8080 por defecto). Detrás de su
# balanceador, --proxy-headers hace que la API vea https y la IP real.
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*'"]

# Imagen de la API de SIMIQ3D, para correrla fuera de Vercel. Compatible con
# Docker y Podman.
#
# Dos etapas: la primera instala las dependencias con uv; la segunda solo
# copia el entorno ya armado, sin uv ni cachés, y corre sin root.

FROM python:3.14-slim@sha256:22eafb370920ad8b429e0aec3fff433e0669968519f5d60469d83729c138b28b AS build

COPY --from=ghcr.io/astral-sh/uv:0.12.18@sha256:3adc3706091ce7c2fe595e669628caedd6d951551b92b258b7e7dbe06d9440bc /uv /bin/uv

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


FROM python:3.14-slim@sha256:22eafb370920ad8b429e0aec3fff433e0669968519f5d60469d83729c138b28b

RUN useradd --create-home --uid 1000 simiq3d
WORKDIR /app
COPY --from=build --chown=simiq3d:simiq3d /app /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

USER simiq3d

# El puerto llega en $PORT (8080 por defecto). Detrás de un balanceador,
# --proxy-headers hace que la API vea https y la IP real.
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*'"]

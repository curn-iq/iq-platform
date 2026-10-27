# Checklist — Backend de SIMIQ3D

Avance del backend de SIMIQ3D. Se marca cada pieza al terminarla. Cómo está
hecho y cómo se corre: [`backend/README.md`](../backend/README.md).

## Base del proyecto

- [x] Proyecto Python con `uv` (Python 3.14), FastAPI y arquitectura hexagonal
- [x] Configuración con `pydantic-settings` y `.env.example`
- [x] `GET /health`
- [x] Ruff y pytest
- [x] Imagen de contenedor (`Dockerfile`) y `vercel.json` (región `cle1`)

## Sesión

- [x] Validar el JWT de DataIQ con su clave pública (JWKS), de la cookie o de
  `Authorization: Bearer`
- [x] `X-IQ-Client` en las escrituras con cookie; CORS cerrado por defecto
- [x] Seguir validando con las claves conocidas si DataIQ no responde; `503`
  si nunca las tuvo

## Base de datos

- [x] PostgreSQL 18 local en contenedor (`simiq3d-db`, puerto 5433)
- [x] Esquema en [`esquema.dbml`](esquema.dbml): `model_mappings` y `chat_logs`
- [x] Migraciones con Alembic (acciones `answer` y `clarify` en una aparte)
- [x] Proyecto de SIMIQ3D en Neon (`simiq3d`, PostgreSQL 18, Ohio), migrado

## Catálogo de DataIQ

- [x] Cliente de `GET /catalog/full` con el token de quien pregunta, copia de
  5 minutos y `ETag`
- [x] Si DataIQ no responde, se usa la última copia
- [x] Ubicación de cada objeto dicha como en la práctica: zona de la mesa,
  vecinos y número del diagrama (nunca fila y columna)

## Chat

- [x] Plantillas de respuesta con datos de DataIQ (motor por defecto y respaldo)
- [x] Agente con Ollama: consulta el catálogo (técnicas, instrumentos, comparar
  mesas, visor) y redacta la respuesta
- [x] Verificación de la respuesta del agente (nombres, números, ubicaciones,
  sin cuadrícula); si no pasa, responden las plantillas
- [x] «¿Quizás quisiste decir…?» para nombres mal escritos
- [x] Pregunta ambigua: pide precisar en qué técnica
- [x] `POST /chat` con el contrato acordado con el frontend
- [x] Probado con Qwen2.5 7B y Qwen3-VL 8B en la RX 6600 XT; por defecto,
  Qwen3-VL 8B instruct
- [ ] Banco de preguntas con su respuesta correcta (ING con ayuda de IQ)
- [ ] Elegir el modelo con el banco de preguntas

## Modelos 3D

- [x] `GET /models` con `Cache-Control` y `ETag`
- [x] Comando `load_models`: de `models/modelos.csv` (nombre o alias) a los ids
  del DataIQ de cada entorno
- [ ] Cargar el mapeo cuando estén los GLB

## Registro de conversaciones

- [x] Registro anónimo con `CHAT_LOG_ENABLED` (acción, ids, quién respondió,
  demora)
- [x] Comando `chat_log` para exportarlo a CSV y borrarlo

## Despliegue

- [x] Workflow de GitHub Actions (estilo y pruebas en cada PR; despliegue en
  cada push a `main` e imagen en ghcr.io)
- [x] Proyecto de Vercel `simiq3d-backend`, con las variables que no son secretas
- [x] `DATABASE_URL` de Neon, `LLM_URL` y `LLM_API_KEY` en Vercel
- [x] Filtro con clave del Servidor PC2 (`servidor-pc2/filtro.py`), con pruebas
  y probado con Ollama
- [x] Servidor PC2: filtro como servicio de usuario (sigue sin sesión abierta)
  y Tailscale Funnel (`https://fedora.tail5cf085.ts.net`, solo el filtro)
- [ ] Servidor PC2 sin suspensión durante las sesiones de uso
- [x] Desplegado en producción: https://simiq3d-backend.vercel.app (sesión
  validada contra la clave pública del DataIQ de producción)
- [ ] Chat probado de punta a punta en producción, con una cuenta de DataIQ
- [ ] Rewrite `/api/simiq3d/*` en el proyecto de Vercel del frontend

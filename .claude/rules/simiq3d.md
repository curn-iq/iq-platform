---
paths:
  - "simiq3d/**"
---

# SIMIQ3D

Qué es y por qué está hecho así: `simiq3d/README.md`. Backend:
`simiq3d/backend/README.md`. Modelos 3D: `simiq3d/models/README.md`.

- **Alcance del MVP:** la mesa de Mayo de las cinco técnicas de Cirugía
  General de DataIQ. La mesa es de tamaño provisional, la misma para todas, y
  todos los instrumentos apuntan igual.
- **SIMIQ3D no es evaluación:** explora y consulta. Practicar con puntaje es
  función de SIVRI.
- **El chat es un agente:** el modelo de lenguaje (Ollama en el Servidor PC2)
  solo sabe lo que devuelven las consultas de `app/domain/tools.py`, y
  `app/domain/grounding.py` verifica que cada nombre, número y ubicación de su
  respuesta esté en esos resultados. Si no pasa, si no consultó nada o si se
  acaba el tiempo, responden las plantillas (`app/domain/chat.py`), que solo
  usan datos de DataIQ. Lo que muestra el visor sale de `show_in_3d`, con ids
  reales, nunca del texto.
- **Nunca hablarle al estudiante de filas, columnas ni celdas:** la mesa real
  no tiene cuadrícula. Se dice la zona de la mesa («arriba a la derecha»), lo
  que tiene al lado y el número del diagrama de IQ.
- **El registro de conversaciones** (`CHAT_LOG_ENABLED`) es anónimo: no guarda
  la cuenta. Los logs del servidor no incluyen el texto de la pregunta ni de
  la respuesta.
- **El mapeo modelo 3D → instrumento** vive en la base de SIMIQ3D. Se carga
  desde `simiq3d/models/modelos.csv` (por nombre o alias) con
  `uv run python -m app.adapters.inbound.cli.load_models`, que necesita
  `DATAIQ_URL` del mismo entorno que la base que se carga.
- **Un modelo 3D nuevo** sigue las convenciones de `simiq3d/models/README.md`
  y lleva sus medidas con su fuente en `modelos.csv`. Las medidas coinciden
  con lo que dice la descripción del instrumento en DataIQ.
- El Servidor PC2 expone un filtro con clave, nunca Ollama directamente:
  `simiq3d/servidor-pc2/README.md`.

---
paths:
  - "simiq3d/**"
---

# SIMIQ3D

Qué es y por qué está hecho así: `simiq3d/README.md`. Backend:
`simiq3d/backend/README.md`. Modelos 3D: `simiq3d/models/README.md`.

- **Alcance del MVP:** la mesa de Mayo de las cinco técnicas de Cirugía
  General de DataIQ, sin tiempos quirúrgicos (DataIQ no los tiene: el chat no
  ordena ni agrupa las piezas por tiempos). La mesa es de tamaño provisional,
  la misma para todas, y todos los instrumentos apuntan igual.
- **SIMIQ3D no es evaluación:** explora y consulta. Practicar con puntaje es
  función de SIVRI.
- **El modelo entiende y DataIQ responde:** el modelo de lenguaje (Ollama en
  el Servidor PC2) solo convierte la pregunta en pedidos (`TOOLS` del agente,
  `app/domain/requests.py`); cada pedido se responde con las plantillas de
  `app/domain/chat.py`, con datos de DataIQ. Después el modelo redacta la
  respuesta solo con esos datos (`app/domain/writing.py`), y el texto se
  verifica antes de mostrarlo; si no pasa o tarda, se muestra lo armado. Lo que
  pide el modelo se valida contra las palabras de la conversación (`as_said`,
  `contradicted`). Si el Servidor PC2 está lento,
  responden las reglas fijas (`adapters/outbound/language/fake.py`). Un tipo
  de pregunta nuevo es un pedido nuevo con su plantilla y sus preguntas en
  `eval/banco.csv`.
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

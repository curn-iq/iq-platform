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
- **El tutor conversa y DataIQ manda en la mesa:** el código decide de qué se
  habla, qué datos de DataIQ recibe el modelo y qué hace el visor
  (`app/domain/focus.py`, `app/domain/tutor.py`); el modelo de lenguaje (Ollama
  en el Servidor PC2) escribe la respuesta en una llamada y puede explicar con
  conocimiento general lo que DataIQ no trae. Cada frase se revisa contra los
  límites duros (`app/domain/review.py`): la mesa de Mayo según DataIQ, nada de
  ordenar o agrupar por tiempos quirúrgicos, ni dosis, ni cuadrícula; la que
  cruza uno se cambia por el dato de DataIQ, nunca se descarta en silencio. Sin
  el modelo, la respuesta lo dice y muestra lo de DataIQ. Un límite nuevo va en
  `review.py` con sus preguntas en `eval/banco.csv` (columna `limite`). El chat
  por pedidos (`CHAT_ENGINE=pedidos`) queda solo para comparar.
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

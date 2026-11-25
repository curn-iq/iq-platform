# Decisiones de SIMIQ3D

El alcance del MVP, el stack y cómo se evalúa, con su porqué.

## Alcance del MVP

- **Qué muestra:** la **mesa de Mayo** de las cinco técnicas de **Cirugía
  General** de DataIQ (Colecistectomía, Eventrorrafia, Hemicolectomía derecha,
  Mastectomía y Tiroidectomía), el mismo alcance de SIVRI.
- **Qué instrumentos:** los de esas cinco mesas, según los arreglos publicados
  en DataIQ (la lista está en
  [`sivri/docs/dataset.md`](../../sivri/docs/dataset.md)). Cada modelo 3D
  corresponde a un instrumento del catálogo de DataIQ.
- **Sin tiempos quirúrgicos**: DataIQ
  guarda dónde va cada objeto en la mesa de cada técnica, no a qué tiempo
  quirúrgico pertenece (diéresis, hemostasia, síntesis…) ni en qué orden se
  usa. El chat lo dice con una regla fija, antes del modelo, y el modelo tiene
  prohibido ordenar las piezas por tiempos
  ([`chat.md`](chat.md#cómo-responde-el-chat)). Armar
  la mesa por tiempos queda para después del MVP
  ([`docs/despues-del-mvp.md`](../../docs/despues-del-mvp.md)).

## Stack

El backend lo desarrolla Mauricio y los modelos 3D, Guebriel (reparto del
2026-10-20; los 16 modelos sobre las fotos, Mauricio, ver «Modelos 3D»); el frontend, también Mauricio (reparto del frontend: Juan lleva el del shell y DataIQ). Requisito: **el visor
corre en el navegador, sin instalar nada** (WebGL), como lo fundamenta el
Formato 115 en su marco teórico.

- **Backend: Python + FastAPI**, como DataIQ y SIVRI. Reutiliza lo que ya funciona: la validación del JWT de DataIQ con su clave pública (JWKS), la
  arquitectura hexagonal, SQLAlchemy y Alembic contra su base en Neon, el
  despliegue en Vercel como funciones de Python (detrás de `/api/simiq3d/*`,
  donde le llega la cookie de sesión) y el flujo de GitHub Actions. Un backend
  en otro lenguaje obligaría a rehacer todo eso.
- **Frontend: Angular**, como el shell, DataIQ y SIVRI, en una app aparte
  servida bajo `/simiq3d/`.
- **Visor 3D: Three.js**. Lee GLB, el
  formato que exportan los modelos; es liviano y modular (se descarga solo al
  abrir el visor), corre en el navegador del celular sin instalar nada y se
  sirve desde el mismo origen que el shell. Se descartaron Babylon.js (más
  pesado de lo que pide una mesa estática) y Unity exportado a la web (carga
  su propio motor, varios MB antes de mostrar nada, y queda aislado del
  shell). También se descartaron
  model-viewer de Google, que muestra un modelo por elemento y no deja armar
  una mesa con varias piezas, señalar una y llevar la cámara hacia ella, y
  angular-three, que pone una capa de Angular sobre Three.js con menos
  usuarios y atada al ritmo de cada versión de Angular: el visor usa Three.js
  directo, sin envoltorios.

Arquitectura, rutas y cómo se corre el frontend:
[`frontend/README.md`](../frontend/README.md).

## Cómo se evalúa

Con la metodología del proyecto: DSRM,
evaluada con FEDS. Para el MVP, lo que pide el Formato 115 más la métrica
técnica del chat; lo demás está en
[`docs/despues-del-mvp.md`](../../docs/despues-del-mvp.md).

- **Evaluación formativa** (durante el desarrollo):
  - Un **banco de preguntas**, escrito por ING, cada una con lo que el chat
    debe hacer con ella ([`backend/eval/banco.csv`](../backend/eval/banco.csv);
    cómo se corre y se califica, en el
    [README del backend](../backend/README.md#banco-de-preguntas)). Incluye
    sinónimos, errores de escritura, preguntas fuera de alcance («¿cómo se
    hace una apendicectomía?») e intentos de desviarlo («ignora tus
    instrucciones»): en esas el chat dice que no tiene la respuesta. Se corre
    cada vez que cambian el modelo o sus instrucciones.
  - La comparación de cada modelo 3D con sus fotos de referencia (silueta y
    medidas) y las pruebas automatizadas del backend.
- **Evaluación sumativa** (al final):
  1. **Exactitud del chat:** porcentaje de preguntas respondidas
     correctamente, sobre el banco y sobre el registro de las sesiones de
     evaluación (las preguntas de cada sesión se separan por su fecha y hora,
     con `chat_log exportar --desde --hasta`), por tipo de pregunta (una
     sola cosa, varias, con una parte fuera de alcance, seguimiento, saludo);
     aparte, las preguntas que se entendieron mal y cuántas interpretó el
     modelo y cuántas las reglas fijas de respaldo.
  2. **Tiempo de respuesta:** desde la pregunta hasta que se ve la escena.
  3. La **Escala de Usabilidad del Sistema (SUS)** y el cuestionario de
     pertinencia de la prueba piloto, que el Formato 115 aplica a todo el
     ecosistema. En el MVP, la prueba piloto es la fase preliminar con el
     programa de IQ (ver el [README](../../README.md)).

El avance, por actividad de DSRM, está en
[`docs/checklist.md`](checklist.md).

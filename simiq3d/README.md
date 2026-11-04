# SIMIQ3D

Sistema Interactivo de Modelado e Instrumentación Quirúrgica 3D.

Herramienta conversacional (chat + visor 3D): el estudiante consulta técnicas
quirúrgicas en lenguaje natural y el sistema muestra una escena 3D con el
instrumental dispuesto en mesa, que puede rotar y explorar. Es exploración y
consulta, no evaluación (la práctica con retroalimentación es función de SIVRI).
Consume DataIQ como base de conocimiento.

## Alcance del MVP

Decidido por Mauricio el 2026-10-15:

- **Qué muestra:** la **mesa de Mayo** de las cinco técnicas de **Cirugía
  General** de DataIQ (Colecistectomía, Eventrorrafia, Hemicolectomía derecha,
  Mastectomía y Tiroidectomía), el mismo alcance de SIVRI.
- **Qué instrumentos:** los de esas cinco mesas, según los arreglos publicados
  en DataIQ (la lista está en
  [`sivri/docs/dataset.md`](../sivri/docs/dataset.md)). Cada modelo 3D
  corresponde a un instrumento del catálogo de DataIQ.
- **Sin tiempos quirúrgicos** (decidido por Mauricio el 2026-11-02): DataIQ
  guarda dónde va cada objeto en la mesa de cada técnica, no a qué tiempo
  quirúrgico pertenece (diéresis, hemostasia, síntesis…) ni en qué orden se
  usa. El chat lo dice con una regla fija, antes del modelo, y el modelo tiene
  prohibido ordenar las piezas por tiempos
  ([`backend/README.md`](backend/README.md), «Cómo responde el chat»). Armar
  la mesa por tiempos queda para después del MVP
  ([`docs/despues-del-mvp.md`](../docs/despues-del-mvp.md)).

## Modelos 3D

Decidido por Mauricio el 2026-10-15: **modelos propios, modelados a mano en
Blender**. Blender es gratis para cualquier uso y lo que se crea con él es de
quien lo hace, así que los modelos pueden ir en el repo y servirse en la web.
(Primero se planeó modelarlos con Claude y la skill
[blender-image-to-3d](https://github.com/majidmanzarpour/blender-game-skills);
se descartó el mismo día porque exige que más integrantes del equipo tengan
Claude Pro.)

Por qué no otras fuentes (revisadas el 2026-10-15):

| Fuente | Por qué no |
|---|---|
| Tiendas de pago (Unity Asset Store, TurboSquid, CGTrader) | Sus licencias prohíben redistribuir los modelos o dejar que se extraigan del producto; un visor web le entrega el archivo al navegador y el repo es público. Además, sus paquetes son genéricos: no traen Rochester, Babcock, Farabeuf ni Senn Miller, ni distinguen la pinza de disección con o sin garra |
| Modelos gratis de Sketchfab (CC BY) | La licencia sirve, pero lo que hay es genérico (bisturís, «forceps», un portaagujas), cada uno en un estilo y algunos de más de un millón de caras |
| Generadores de imagen a 3D (Meshy, Tripo) | Fallan en objetos delgados y metálicos con puntas finas, y la punta es justo lo que distingue un instrumento de otro: lo que inventen no sale de una fuente |

Cómo se hacen:

- **Por familias.** Los instrumentos de las mesas comparten forma, así que se
  modela una base por familia y cada instrumento es una variante:

  | Familia | Instrumentos | Qué cambia |
  |---|---|---|
  | Pinzas con anillos y cremallera | Kelly, Kelly Adson, Mosquito curva, Kocher, Rochester, Allis, Babcock, Lahey, Moynihan, portaagujas | La punta |
  | Tijeras | Mayo, Metzenbaum | El largo y la punta |
  | Pinzas de disección | Con garra, sin garra | Los dientes |
  | Bisturí | Mangos N.° 3, 4 y 7; hojas #10, #10-11, #15 y #20 | Las medidas |
  | Separadores | Farabeuf, Senn Miller | La forma |

- **Referencias:** fotos de catálogo de cada instrumento (fabricantes y
  distribuidores de instrumental quirúrgico), puestas como imagen de fondo en
  Blender. Las medidas salen de la ficha del fabricante (el largo total suele
  venir en ella) o de la foto, a escala con ese largo. Las imágenes son de
  terceros: no se suben al repo, solo su enlace.
- **Todo queda en el repo:** el `.blend` de cada familia, el GLB de cada
  instrumento y una tabla con sus medidas principales (largo total, largo de
  la punta, ancho de los anillos…), cada una con su fuente (el enlace a la
  foto o a la ficha) o marcada como inferida. Así cada modelo se puede
  revisar en un PR y corregir.

Las convenciones de cada modelo (escala, origen, orientación, nombres), qué
medidas son reales y cuáles inferidas, y cómo se mapea cada modelo a su
instrumento: [`models/README.md`](models/README.md).

## Chat

Decidido por Mauricio el 2026-10-15. Desde el 2026-11-03 el chat es un
**tutor**: el modelo de lenguaje conversa con el estudiante, con los datos de
DataIQ de lo que se habla (decidido por Mauricio ese día, después de probar en
producción el chat por pedidos).

- **Cómo responde**, en una sola llamada al modelo por pregunta:
  1. **El código decide de qué se habla** (`app/domain/focus.py`): las técnicas
     y los instrumentos que nombra la pregunta (por su nombre, un alias o «la
     Kelly»), la técnica abierta en el visor («esta técnica», «su mesa») y, en
     un seguimiento («¿y cuándo se usa?», «¿y en la tiroidectomía?»), lo de las
     preguntas anteriores. Una técnica nombrada gana a la abierta. Una técnica
     descrita sin nombrarla («la cirugía para quitar la vesícula») se reconoce
     por las palabras de su descripción en DataIQ que solo están en ella.
  2. **Trae de DataIQ solo eso** (`data_of`, en `app/domain/tutor.py`): de cada
     técnica, sus datos clínicos y la mesa de Mayo objeto por objeto (número
     del diagrama, zona y vecinos; sin la mesa, en un seguimiento como «dime lo
     demás», el modelo la inventaba); de cada
     instrumento, su descripción y en qué mesas va y dónde; de dos técnicas, lo
     que llevan las dos y cada una; de una técnica de otra especialidad, sus
     datos y que SIMIQ3D no muestra su mesa. Lo que DataIQ no tiene va dicho
     («DataIQ no lo tiene»), para que el modelo no lo invente.
  3. **Decide qué hace el visor** (`scene_of`): señala el instrumento, o abre
     su ficha si se pregunta qué es o para qué sirve; abre la técnica con el
     dato o la lista que se pide; y no cambia nada si solo se conversa («¿qué
     es la hemostasia?», comparar dos técnicas). El modelo no decide la escena.
     También arma las preguntas sugeridas, para que siempre tengan respuesta.
  4. **El modelo escribe la respuesta** con el prompt `TUTOR`: conversa,
     responde primero lo preguntado y explica con su conocimiento general lo
     que DataIQ no trae (para qué sirve un instrumento, qué es un tiempo
     quirúrgico), diciéndolo con naturalidad («en general…»). Recibe las
     preguntas anteriores como turnos de la conversación, con su respuesta
     recortada, y al final los datos y la pregunta, como recomienda Anthropic
     para contextos largos
     ([*Long context prompting tips*](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/long-context-tips)).
     Escribe en Markdown sencillo (negrita y listas), con temperatura 0,3.
  5. **Se revisa frase por frase** (`app/domain/review.py`): la frase que cruza
     un límite duro se quita y en su lugar va el dato de DataIQ o una nota de lo
     que DataIQ no tiene; el resto queda como lo escribió el modelo. Si la
     revisión quita más de la mitad de la respuesta, el modelo tiene una
     segunda oportunidad, con lo que estuvo mal.
  6. **Sin el modelo** (el Servidor PC2 apagado, ocupado o pasado el tope de
     `LLM_DEADLINE`), la respuesta lo dice y muestra lo que DataIQ tiene de lo
     que se nombró. Es lo único con forma fija, porque sin el modelo no hay
     quién redacte.

- **Los límites duros**, los que el modelo no puede cruzar aunque explique con
  su conocimiento general (acordados por Mauricio el 2026-11-03):

  | Límite | Cómo se revisa | Qué queda en su lugar |
  |---|---|---|
  | La mesa de Mayo: un instrumento que no va en esa mesa, un objeto con número que DataIQ no tiene, o el número del diagrama, la zona o cuántos objetos lleva, distintos de DataIQ | Las frases que ubican una pieza o cuentan objetos, contra DataIQ (también una lista numerada, una zona con sus números y lo que se dice de la pieza de la pregunta en cada mesa que se nombra) | Dónde va de verdad, como lo dice DataIQ |
  | Ordenar o agrupar la mesa por tiempos quirúrgicos u orden de uso | Las frases que ordenan («se usa primero») o que ubican o agrupan piezas por un tiempo («instrumental de diéresis:»). Explicar qué es un tiempo sí se puede | Que DataIQ no tiene los tiempos ni el orden de uso, solo dónde va cada pieza |
  | Dosis de medicamentos | Una cifra con su unidad (mg, ml, UI…) | Que el chat no da dosis: las indica el equipo médico |
  | Filas, columnas o celdas | Las palabras | Nada: la frase sale |

  Además, si el modelo propone mover las piezas en el visor, la frase se cambia
  por lo que hace SIMIQ3D: la mesa se mira y se consulta.

  Si la pregunta pide la mesa por tiempos quirúrgicos, el modelo además recibe
  un aviso antes de escribir. Lo que el modelo diga de una técnica que DataIQ no
  tiene no se puede revisar contra nada: el prompt le prohíbe decir qué lleva
  su mesa, y el banco lo mide.

- **Salud personal y lo que no es del tema.** A una pregunta sobre la salud de
  quien escribe o de alguien cercano, el tutor explica en general qué opciones
  existen y dice que la decisión es del equipo médico, sin diagnosticar ni
  decir qué le conviene; el visor no abre la técnica que describe. A lo que no
  es de salud ni de instrumentación quirúrgica, lo dice en una frase y ofrece
  ayuda con la mesa: si la pregunta no nombra nada de DataIQ, el modelo recibe
  ese aviso antes de escribir (sin él respondía «¿cuál es la capital de
  Francia?»). Nunca responde solo «fuera de alcance».

- **De dónde sale cada cosa, a la vista.** Bajo cada respuesta del modelo, el
  frontend dice: «Mesa y técnica: DataIQ. Lo demás lo explica un modelo de IA y
  puede equivocarse» (`ChatOut.generated`), y el campo de pregunta, que
  responde un modelo de IA con los datos de DataIQ. Microsoft pide dejar claro
  qué hace el sistema y qué tan bien
  ([guías 1 y 2 de interacción humano-IA](https://www.microsoft.com/en-us/haxtoolkit/library/pattern/)),
  y la OMS advierte que en salud las personas tienden a creerle de más a la IA
  (sesgo de automatización)
  ([*Guidance on large multi-modal models*](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models)).

- **Por qué así.** El chat por pedidos (el modelo convertía la pregunta en una
  de diez funciones, cada una con su plantilla, y después redactaba solo con
  esos datos) era fiel a DataIQ pero no conversaba: en producción, «¿para qué
  sirve la Kelly?» y «¿cuándo se usa?» recibían la misma descripción física,
  «hola» no se respondía bien, y la verificación de la redacción rechazaba
  cualquier explicación («porque», «ya que») y volvía a las plantillas.
  Mauricio consultó el rediseño con el mismo prompt a Gemini, ChatGPT y Claude
  el 2026-11-03, y las tres respuestas coincidieron en lo que se adoptó: una
  sola llamada al modelo, el código decide los datos y el visor, la mesa la
  dice DataIQ, el conocimiento general se permite y se marca, y se revisan
  afirmaciones y no respuestas enteras.
  - Anthropic recomienda empezar por la forma más simple, un modelo con la
    información que necesita, antes de agregar pasos
    ([*Building effective agents*](https://www.anthropic.com/engineering/building-effective-agents)).
  - OpenAI recomienda protecciones en capas sobre lo que devuelve el modelo,
    agregadas según las fallas reales
    ([*A practical guide to building agents*](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)),
    y revisar frase por frase contra la fuente
    ([*Developing hallucination guardrails*](https://developers.openai.com/cookbook/examples/developing_hallucination_guardrails)).
  - Microsoft pide degradar el servicio con gracia cuando el sistema no puede
    responder (guía 10): por eso, sin el modelo, la respuesta muestra lo que
    DataIQ tiene.

- **Riesgo aceptado: las explicaciones generales pueden equivocarse**
  (decidido por Mauricio el 2026-11-03). El modelo explica lo que DataIQ no
  trae con su conocimiento general, y un modelo de 8B se equivoca. Se acepta,
  porque un chat que no explica no cumple su propósito, y se controla: la
  revisión cuida los límites duros, la línea de fuentes dice que puede
  equivocarse, el banco de preguntas lo mide con un juez y una muestra la
  revisa IQ. Un modelo mayor, si el proyecto se financia, reduce el riesgo
  ([`docs/despues-del-mvp.md`](../docs/despues-del-mvp.md)).

- **Sin mostrar el texto mientras se escribe:** cada frase se revisa antes de
  mostrarse. Mostrarlo frase por frase, ya revisada, está en
  [`docs/despues-del-mvp.md`](../docs/despues-del-mvp.md).

- **Dónde va cada cosa, dicho como en la práctica:** la cuadrícula de DataIQ
  es cómo se guarda el arreglo, no cómo se habla de él (la mesa real es un
  campo sin líneas). El chat ubica cada objeto por la zona de la mesa
  («arriba a la derecha», «en el centro»), por lo que tiene al lado y por su
  número en el diagrama de IQ. Las zonas se dicen como se ven en el diagrama y
  en el visor.

- **Errores de escritura:** el tutor corrige un nombre que se parece mucho a
  una técnica o a un instrumento de las mesas del MVP («masectomia», «kely») y
  responde, sin preguntar. Con todo el instrumental de DataIQ corregía palabras
  comunes («vesícula» por el Separador vesical). Las reglas fijas (`LANGUAGE_MODEL=fake`) responden «¿Quizás
  quisiste decir…?» con la pregunta corregida.

- **El chat por pedidos** sigue en el código (`CHAT_ENGINE=pedidos`), para
  compararlo con el tutor en el banco de preguntas.

- **Modelo local y abierto, con [Ollama](https://ollama.com)**, en el
  **Servidor PC2**: un PC de escritorio con GPU (AMD RX 6600 XT de 8 GB, 32 GB
  de RAM), con una dirección HTTPS fija de Tailscale Funnel, como el Servidor
  PC1 de SIVRI. Es gratis y no depende de un tercero; para un MVP que demuestra que
  funciona no hace falta más capacidad.
- **El backend de SIMIQ3D queda en Vercel** (detrás de `/api/simiq3d/*`) y le
  pregunta al modelo. Si el Servidor PC2 está apagado, el chat lo dice y
  muestra lo que DataIQ tiene; el visor y las técnicas siguen funcionando.
- **Funnel expone un filtro con clave, no Ollama**, que no tiene
  autenticación propia: el filtro exige una clave secreta que solo conoce el
  backend (variable de entorno secreta de su proyecto en Vercel).
- **Intercambiable:** el backend habla con el modelo por un puerto
  (arquitectura hexagonal), con la API compatible con OpenAI que da Ollama.
  Pasar el modelo a otro equipo, o a una API en la nube, es cambiar la
  configuración.

- **Modelo del MVP: Qwen3-VL 8B instruct** (`qwen3-vl:8b-instruct`, unos
  6 GB), al 100 % en la GPU del Servidor PC2 (decidido por Mauricio el
  2026-10-27). Comparado con Qwen2.5 7B sobre las mismas 18 preguntas:
  respondió él mismo 14 (contra 13), con respuestas más completas (todas las
  ubicaciones de un instrumento, todos sus vecinos), y ninguno de los dos dejó
  pasar un dato falso; a cambio tarda más (mediana de 3,9 s contra 2,4 s,
  máximo 6,7 s). La variante *instruct* y no la *thinking*: razonar antes de
  cada paso sumaría segundos. El banco de preguntas mide su exactitud; un
  modelo más grande, en [`docs/despues-del-mvp.md`](../docs/despues-del-mvp.md).
  Cómo se monta el Servidor PC2: [`servidor-pc2/README.md`](servidor-pc2/README.md).

## Cómo se arma la mesa en 3D

Decidido por Mauricio el 2026-10-15. DataIQ dice en qué celda va cada objeto
(cuadrículas de distinto tamaño, dibujadas a mano), no dónde exactamente ni
hacia dónde apunta:

- **La cuadrícula se reparte en partes iguales sobre la mesa**, la misma regla
  de SIVRI: lo que el estudiante ve en 3D es lo que SIVRI le revisa.
- **La mesa, de tamaño provisional**, la misma para todas las técnicas.
  Medirla es para después del MVP
  ([`docs/despues-del-mvp.md`](../docs/despues-del-mvp.md)).
- **Los instrumentos, a escala real** (ver «Modelos 3D»), con **su centro
  en el centro de su celda** y apoyados en la mesa (el origen de cada modelo
  está a la altura de su punto más bajo). Un instrumento suele ser más largo que una celda:
  sobresale hacia las vecinas, como en la mesa real. SIVRI mide igual: por el
  centro.
- **Todos los instrumentos apuntan igual.** Hacia dónde apunta cada uno es
  para después del MVP.
- **Dentro de la mesa y sin taparse** (decidido por Mauricio el
  2026-11-01): una pieza que se saldría por el borde, o que taparía a otra
  hasta no distinguir cuál es cuál, se corre lo justo, hacia adentro o a lo
  ancho, junto a su vecina. En una mesa real ninguna pieza cuelga del borde y,
  aunque estén juntas, se distinguen. Las demás quedan en el centro de su
  celda.
- **Objetos compuestos:** el mango con su hoja va en la celda como un
  mango, con la hoja montada en él: la hoja se cuelga del nodo `blade_mount`
  de su mango ([`models/README.md`](models/README.md), «Mango y hoja»). Dos
  instrumentos independientes en la misma celda van uno al lado del otro.

## Backend y base de datos

Decidido por Mauricio el 2026-10-15. El backend corre en Vercel (ver «Chat») y
tiene su propia base en Neon, en un proyecto aparte, como cada módulo:

| Qué | Dónde | Por qué |
|---|---|---|
| Mapeo de cada modelo 3D a su instrumento de DataIQ (`instruments.id`) | Base de SIMIQ3D | Ese mapeo es de SIMIQ3D, no de DataIQ, como las clases de YOLO en SIVRI. Los ids del catálogo cambian de una instalación a otra: el repo guarda el mapeo por nombre del instrumento (o un alias) y un comando lo traduce a ids en cada entorno con la API de DataIQ |
| Registro de las conversaciones: pregunta, acción elegida por el modelo y fecha | Base de SIMIQ3D | Sin él no hay cómo demostrar con números que el chat funciona (ver abajo) |
| Contador de preguntas por cuenta, con el id cifrado (HMAC), por unos minutos | Base de SIMIQ3D | Que nadie llene de consultas el Servidor PC2; no deja saber de quién es y se borra al día |
| Archivos de los modelos (GLB) | Archivos estáticos del frontend, en Vercel | Se descargan una vez y quedan en caché; en Neon gastarían su medio GB |
| Técnicas e instrumentos que el chat le ofrece al modelo | DataIQ, por `/catalog/full`, que el backend cachea por sesión | DataIQ es la única fuente de verdad |
| La mesa que dibuja el visor y la descripción de cada instrumento | DataIQ, que el frontend lee directo (`GET /techniques/{id}/instruments`, `GET /instruments`) | No pasa por el backend de SIMIQ3D: sería un salto más sin aportar nada, y el visor sigue funcionando sin el chat |

El registro de conversaciones:

- **Sin datos de quién pregunta**: no guarda la cuenta ni nada que identifique
  a la persona.
- Está encendido mientras dura el proyecto (decidido por Mauricio el
  2026-10-27): mide la exactitud con preguntas reales, no solo con las de las
  sesiones de evaluación. En la prueba piloto, los participantes además dan su
  consentimiento informado (Resolución 8430 de 1993).
- Al cerrar la evaluación sumativa se exporta lo que necesita el informe, se
  borra y se apaga (`CHAT_LOG_ENABLED=false`): los datos se guardan solo
  mientras sirven a su finalidad (Decreto 1377 de 2013, art. 11). Se vuelve a
  encender solo si la política declara una finalidad nueva.
- La pregunta es texto libre y podría traer datos de un paciente, que son
  datos sensibles (Ley 1581 de 2012, art. 5). Por eso el frontend avisa bajo el
  campo del chat: «Tus preguntas se guardan sin tu nombre para medir el chat.
  No escribas datos de pacientes».
- El [aviso de privacidad](../docs/privacidad.md) lo declara, con su
  finalidad (Ley 1581 de 2012): es condición para abrir la plataforma a los
  estudiantes.

## Cómo se evalúa

Decidido por Mauricio el 2026-10-15, con la metodología del proyecto: DSRM,
evaluada con FEDS. Para el MVP, lo que pide el Formato 115 más la métrica
técnica del chat; lo demás está en
[`docs/despues-del-mvp.md`](../docs/despues-del-mvp.md).

- **Evaluación formativa** (durante el desarrollo):
  - Un **banco de preguntas**, escrito por ING, cada una con lo que el chat
    debe hacer con ella ([`backend/eval/banco.csv`](backend/eval/banco.csv);
    cómo se corre y se califica, en el
    [README del backend](backend/README.md#banco-de-preguntas)). Incluye
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
     programa de IQ (ver el [README](../README.md)).

El avance, por actividad de DSRM, está en
[`docs/checklist.md`](docs/checklist.md).

## Stack

El backend lo desarrolla Mauricio y los modelos 3D, Guebriel (reparto del
2026-10-20); el frontend, también Mauricio (reparto del frontend acordado por
Mauricio y Juan Caraballo el 2026-11-01: Juan lleva el del shell y DataIQ). Requisito: **el visor
corre en el navegador, sin instalar nada** (WebGL), como lo fundamenta el
Formato 115 en su marco teórico.

- **Backend: Python + FastAPI**, como DataIQ y SIVRI (confirmado por Guebriel
  el 2026-10-15). Reutiliza lo que ya funciona: la validación del JWT de DataIQ con su clave pública (JWKS), la
  arquitectura hexagonal, SQLAlchemy y Alembic contra su base en Neon, el
  despliegue en Vercel como funciones de Python (detrás de `/api/simiq3d/*`,
  donde le llega la cookie de sesión) y el flujo de GitHub Actions. Un backend
  en otro lenguaje obligaría a rehacer todo eso.
- **Frontend: Angular**, como el shell, DataIQ y SIVRI, en una app aparte
  servida bajo `/simiq3d/` (decidido por Juan el 2026-10-15).
- **Visor 3D: Three.js** (decidido por Juan el 2026-10-15). Lee GLB, el
  formato que exportan los modelos; es liviano y modular (se descarga solo al
  abrir el visor), corre en el navegador del celular sin instalar nada y se
  sirve desde el mismo origen que el shell. Se descartaron Babylon.js (más
  pesado de lo que pide una mesa estática) y Unity exportado a la web (carga
  su propio motor, varios MB antes de mostrar nada, y queda aislado del
  shell). También se descartaron (revisado por Mauricio el 2026-11-01)
  model-viewer de Google, que muestra un modelo por elemento y no deja armar
  una mesa con varias piezas, señalar una y llevar la cámara hacia ella, y
  angular-three, que pone una capa de Angular sobre Three.js con menos
  usuarios y atada al ritmo de cada versión de Angular: el visor usa Three.js
  directo, sin envoltorios.

Arquitectura, rutas y cómo se corre el frontend:
[`frontend/README.md`](frontend/README.md).

## Estructura

```
simiq3d/
├── backend/                   FastAPI: el chat y el mapeo de modelos (ver su README)
├── servidor-pc2/              filtro con clave para Ollama y cómo montar el Servidor PC2
├── frontend/                  Angular + Three.js
├── models/                    assets 3D y modelos.csv
│   ├── blender/               .blend por familia
│   └── glb/                   GLB por instrumento
└── docs/
    ├── checklist.md           avance por actividad de DSRM
    ├── checklist-backend.md   avance del backend
    ├── checklist-frontend.md  avance del frontend, por fases
    └── esquema.dbml           base de datos de SIMIQ3D
```

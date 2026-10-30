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

Decidido por Mauricio el 2026-10-15:

- **Un agente que consulta DataIQ** (*tool calling*, cambio decidido por
  Mauricio el 2026-10-27). El modelo no responde con lo que sabe: tiene
  consultas sobre el catálogo (ver las técnicas, buscar un instrumento y en qué
  mesas va, comparar dos mesas, mostrar algo en el visor), decide cuáles usar y
  en cuántos pasos, y redacta la respuesta con lo que devolvieron. Así responde
  preguntas que nadie programó («¿en cuántas técnicas se usa la Allis?», «¿qué
  lleva la tiroidectomía que no lleve la colecistectomía?»). Antes, el modelo
  solo elegía una de seis acciones y el texto salía de plantillas: eso no
  justificaba usar IA, porque para cada tipo de pregunta nuevo había que
  programar una acción.
- **Riesgo aceptado: el texto lo redacta el modelo**, y un modelo puede
  inventar. Se controla así:
  - el modelo solo ve lo que devuelven las consultas;
  - antes de responder, el backend verifica el texto: cada técnica, cada
    instrumento, cada número y cada ubicación («arriba a la derecha») tiene que
    estar en esos resultados; rechaza las generalizaciones falsas («en todas va
    en el mismo lugar») y cualquier mención de filas, columnas o celdas;
  - si no pasa la verificación, si no consultó nada o si no termina en seis
    pasos, responden las plantillas de antes, que solo usan datos de DataIQ;
  - lo que se ve en 3D sale de la consulta del visor (`show_in_3d`), con ids
    reales. Si el modelo no la usó, el visor abre la técnica abierta (o la
    única que nombra la respuesta) y resalta el instrumento por el que se
    preguntó, si va en esa mesa; solo si la pregunta no nombra ninguno, el
    primero que nombra la respuesta. Siempre con ids de DataIQ: la respuesta
    nombra también a los vecinos («junto a la Kelly Adson»), y resaltar uno de
    ellos señalaría otro instrumento.

  La verificación compara nombres y números, no el sentido de las frases:
  una afirmación falsa escrita solo con palabras puede pasar. Por eso la
  evaluación mide las respuestas inventadas (ver «Cómo se evalúa») y el
  registro guarda qué respondió el modelo y qué las plantillas.
- **Dónde va cada cosa, dicho como en la práctica:** la cuadrícula de DataIQ
  es cómo se guarda el arreglo, no cómo se habla de él (la mesa real es un
  campo sin líneas). El chat ubica cada objeto por la zona de la mesa
  («arriba a la derecha», «en el centro»), por lo que tiene al lado («junto a
  la Rochester») y por su número en el diagrama de IQ. Las zonas se dicen como
  se ven en el diagrama y en el visor.
- **Las preguntas sugeridas las arma el backend** con lo que se consultó, para
  que siempre tengan respuesta; las que escribe un modelo pequeño a menudo no.
- **Errores de escritura:** si un nombre se parece mucho a una técnica o a un
  instrumento («masectomia», «pinza allys»), el chat no adivina: responde
  «¿Quizás quisiste decir…?» con la pregunta corregida como opción.
- **Modelo local y abierto, con [Ollama](https://ollama.com)**, en el
  **Servidor PC2**: un PC de escritorio con GPU (AMD RX 6600 XT de 8 GB, 32 GB
  de RAM), con una dirección HTTPS fija de Tailscale Funnel, como el Servidor
  PC1 de SIVRI. Es gratis y no depende de un tercero; para un MVP que demuestra que
  funciona no hace falta más capacidad.
- **El backend de SIMIQ3D queda en Vercel** (detrás de `/api/simiq3d/*`) y le
  pregunta al modelo. Si el Servidor PC2 está apagado, solo el chat queda no
  disponible: el visor y las técnicas siguen funcionando.
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
  en el centro de su celda**. Un instrumento suele ser más largo que una celda:
  sobresale hacia las vecinas, como en la mesa real. SIVRI mide igual: por el
  centro.
- **Todos los instrumentos apuntan igual.** Hacia dónde apunta cada uno es
  para después del MVP.
- **Objetos compuestos:** el mango con su hoja es un solo modelo, con la hoja
  montada; dos instrumentos en la misma celda van uno al lado del otro.

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
     con `chat_log exportar --desde --hasta`); aparte, las respuestas
     inventadas (meta: ninguna) y cuántas respondió el modelo y cuántas las
     plantillas de respaldo.
  2. **Tiempo de respuesta:** desde la pregunta hasta que se ve la escena.
  3. La **Escala de Usabilidad del Sistema (SUS)** y el cuestionario de
     pertinencia de la prueba piloto, que el Formato 115 aplica a todo el
     ecosistema. En el MVP, la prueba piloto es la fase preliminar con el
     programa de IQ (ver el [README](../README.md)).

El avance, por actividad de DSRM, está en
[`docs/checklist.md`](docs/checklist.md).

## Stack

El backend lo desarrolla Mauricio y los modelos 3D, Guebriel (reparto del
2026-10-20); el frontend, Juan Caraballo, que lleva el frontend de los tres
módulos. Requisito: **el visor
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
  shell).

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

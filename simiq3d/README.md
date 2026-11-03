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

Decidido por Mauricio el 2026-10-15. El reparto entre el modelo y DataIQ lo
cambió Mauricio el 2026-11-03, después de probar el chat en producción.

- **El modelo entiende y DataIQ responde.** El modelo de lenguaje lee la
  pregunta, con la técnica abierta en el visor y las preguntas anteriores de la
  conversación, y la convierte en una lista de **pedidos** (*tool calling*:
  varios en un mismo turno si la pregunta pide varias cosas). El backend
  resuelve cada pedido con los datos de DataIQ y su plantilla, y la respuesta
  une los resultados en el orden en que se pidieron. El modelo no redacta el
  texto que lee el estudiante.

  | Pedido | Ejemplo | Qué responde |
  |---|---|---|
  | `locate` | «¿Dónde va la Kelly?» | La zona de la mesa, lo que tiene al lado y el número del diagrama |
  | `describe` | «¿Qué es la tijera de Mayo?» | La descripción del instrumento |
  | `clinical_data` | «Indicaciones de la mastectomía» | Un dato clínico: para qué sirve, indicaciones, complicaciones, o anestesia y posición |
  | `list_instruments` | «¿Qué lleva la mesa de la mastectomía?» | La mesa de Mayo completa, por número |
  | `show_technique` | «Muéstrame la colecistectomía» | Abre la técnica en el visor |
  | `find_instrument` | «¿En qué técnicas va la Allis?» | Las técnicas donde va, con el total |
  | `compare` | «¿Qué lleva la tiroidectomía que no lleve la colecistectomía?» | Lo que comparten, lo que lleva solo la primera o en qué se diferencian |
  | `rank` | «¿Qué técnica lleva más objetos?» | Las técnicas por número de objetos en la mesa |
  | `out_of_scope` | «Tiempos quirúrgicos de la mastectomía», «la cesárea» | Qué no tiene SIMIQ3D y qué sí (ver abajo) |
  | `greeting` | «Hola», «¿Qué puedes hacer?» | Qué hace el chat, con preguntas de ejemplo |

  Si un nombre no alcanza para saber de qué se habla («el bisturí» en una mesa
  que lleva varios, un nombre parecido a otro), la respuesta pregunta cuál, con
  cada opción, en vez de adivinar.

- **Por qué así.** Las guías de quienes desarrollan los modelos de lenguaje
  separan entender de responder:
  - OpenAI usa el modelo para lo que las reglas fijas no resuelven, como
    interpretar lenguaje natural y conversar, y deja las reglas fijas
    (listas, expresiones regulares) para amenazas conocidas
    ([*A practical guide to building agents*](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)).
  - Anthropic recomienda la solución más simple que funcione y describe dos
    patrones que encajan aquí: clasificar la entrada y mandarla a quien la
    resuelve (*routing*), y partir la tarea en partes independientes
    (*sectioning*)
    ([*Building effective agents*](https://www.anthropic.com/engineering/building-effective-agents)).
    Para reducir lo inventado, recomienda restringir al modelo a la
    información que se le da
    ([*Reduce hallucinations*](https://platform.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)).
  - Rasa CALM usa el modelo para entender a la persona y ejecuta la lógica
    del negocio de forma determinista, con respuestas de plantillas
    ([*Thinking CALMly*](https://rasa.com/docs/rasa-pro/building-assistants/thinking-calmly)).

  Antes era al revés: expresiones regulares decidían qué se preguntaba y el
  modelo redactaba. En una conversación en producción del 2026-11-02, el
  modelo respondió 4 de 10 preguntas y las reglas fijas las otras 6, con una
  sola cosa por mensaje, aunque se pidieran varias.
- **Respuestas cooperativas.** Si una parte de la pregunta está fuera de
  alcance, se responde el resto, y una línea al final dice qué no tiene
  SIMIQ3D y qué sí. Nunca queda «sin respuesta» una pregunta que tenía algo
  que responder. Es el principio cooperativo de Grice, en el que se basan las
  guías de conversación de Google: decir de menos es tan poco cooperativo
  como decir de más
  ([*Learn about conversation*](https://developers.google.com/assistant/conversation-design/learn-about-conversation)).
  Microsoft pide degradar el servicio con gracia cuando el sistema no está
  seguro, y mostrar desde el inicio qué puede hacer
  ([guías 10 y 1 de interacción humano-IA](https://www.microsoft.com/en-us/haxtoolkit/library/pattern/)):
  eso es el pedido `saludo`.
- **Lo que queda fuera, a propósito,** con su respuesta definida:
  - los tiempos quirúrgicos y el orden en que se usa el instrumental, que
    DataIQ no tiene;
  - las preguntas clínicas que DataIQ no trae (dosis, diagnósticos,
    tratamientos);
  - las técnicas de otras especialidades y las que DataIQ no tiene;
  - la conversación libre, fuera del saludo.
- **Contexto.** Para entender un seguimiento («¿y para qué sirve?», «¿y en la
  tiroidectomía?»), el modelo recibe las preguntas anteriores como turnos de
  la conversación, cada una con los pedidos que salieron de ella. `POST /chat`
  devuelve los pedidos de cada respuesta, y el frontend los manda de vuelta
  con las preguntas siguientes; el backend no guarda la conversación. Con un
  resumen en el contexto («la respuesta anterior habló de la Kelly Adson»), el
  modelo se quedaba con la técnica abierta en el visor; con los turnos, no.
- **El visor muestra una sola cosa.** Si la respuesta tiene varios pedidos, la
  escena es la del más visual (ubicar, listar o mostrar) y el texto cubre el
  resto.
- **Qué cambia respecto al 2026-10-27.** Ese día el modelo pasó a redactar la
  respuesta, porque elegir una de seis acciones, con el texto de plantillas,
  no justificaba usar IA. Ahora el modelo hace lo que sí la justifica según
  OpenAI: interpretar lenguaje natural, varias intenciones en un mensaje y el
  contexto de la conversación. Deja de redactar, que es donde estaba el riesgo
  de inventar: el texto sale de DataIQ. Lo que se pierde: una pregunta que no
  encaja en ningún pedido se responde como fuera de alcance, aunque el modelo
  hubiera podido contestarla con las consultas. El registro anónimo muestra
  cuáles aparecen, para agregar pedidos.
- **Riesgo aceptado: el modelo puede entender mal** (elegir otro pedido u otra
  técnica), y la respuesta sería verdadera pero de otra pregunta. Se controla
  así, como recomienda OpenAI con protecciones en capas sobre lo que devuelve
  el modelo:
  - cada nombre de un pedido se resuelve contra los nombres y alias de DataIQ;
    si no está, o si nombra una familia con varios en la mesa, se aclara en
    vez de adivinar;
  - una técnica o un instrumento que no nombró la conversación, ni es la
    técnica abierta, no cuenta: sin técnica abierta, el modelo ponía una de la
    lista en «¿Dónde va la Kelly?», y la respuesta decía que no iba en ella;
  - si el modelo dice que la pregunta no trata de estas técnicas, pero nombra
    una de ellas o un instrumento de sus mesas, responden las reglas fijas;
  - si la pregunta pide tiempos quirúrgicos, la respuesta siempre dice que
    DataIQ no los tiene, aunque el modelo no lo haya marcado;
  - el banco de preguntas mide si se eligieron los pedidos correctos, por tipo
    de pregunta;
  - si el Servidor PC2 está lento u ocupado, las reglas fijas interpretan la
    pregunta como antes, con una sola cosa por mensaje, y la respuesta sale de
    las mismas plantillas. Si está apagado, el chat queda no disponible y el
    visor sigue funcionando.
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
- **Los nombres se resuelven sin el modelo:** una técnica de otra especialidad
  («la cesárea») o un instrumento nombrado por su familia en una mesa que lleva
  varios («el bisturí» de la eventrorrafia) se reconocen al resolver los
  nombres del pedido contra DataIQ. Una técnica descrita sin nombrarla («la
  cirugía para quitar la vesícula») se reconoce por las palabras de su
  descripción en DataIQ que solo están en ella; si hay empate, no adivina.
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

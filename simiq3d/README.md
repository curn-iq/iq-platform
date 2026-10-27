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
  | Pinzas con anillos y cremallera | Kelly, Kelly Adson, Mosquito curva, Kocher, Rochester, Allis, Babcock, Lahey, Moninjan, portaagujas | La punta |
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
- **IQ valida cada modelo**, como valida los datos de DataIQ.

Convenciones, para que los modelos encajen en la escena (ver «Cómo se arma la
mesa en 3D»):

- **Escala real, en metros** (la unidad de glTF).
- **El origen en el centro del instrumento:** la escena lo pone con su centro
  en el centro de su celda.
- **Todos orientados igual:** el eje largo sobre X, con la punta hacia +X. La
  escena los gira según la orientación de la mesa.
- **Pocos polígonos:** se ven en el navegador del celular.
- **Un GLB por instrumento**, con nombre en inglés (`kelly_forceps.glb`), como
  el resto del código.

La tabla de medidas es también el mapeo de cada modelo a su instrumento:
`models/modelos.csv`, con las columnas `instrumento` (el nombre del instrumento
en DataIQ, o uno de sus alias), `archivo` (su GLB) y, después, las medidas y la
fuente de cada una. El backend carga las dos primeras columnas con
`uv run python -m app.adapters.inbound.cli.load_models`: traduce cada nombre a
su id en el DataIQ de ese entorno y deja la tabla `model_mappings` igual al
archivo.

### Fotos del instrumental de IQ (opcional)

Los modelos se hacen con fotos de catálogo, así que estas fotos no son
necesarias. Si hay tiempo en la primera visita al laboratorio para el dataset
de SIVRI ([`sivri/docs/dataset.md`](../sivri/docs/dataset.md)), sirven para
ajustar los modelos a los instrumentos que usa el programa. Son otras fotos que
las de SIVRI: cada instrumento solo, no la mesa.

- Los 23 objetos de la lista, cada uno solo, sobre el campo liso de la mesa.
  Las hojas de bisturí, sueltas.
- **Una regla milimetrada al lado**, en el mismo plano que el instrumento: da
  la escala real.
- Tres fotos de cada uno:
  1. **Desde arriba**, con el instrumento plano y cerrado como va en la mesa,
     y el celular paralelo a la mesa.
  2. **De perfil**, con el celular a la altura de la mesa.
  3. **La punta de cerca**, desde arriba: es lo que distingue un instrumento
     de otro.
- Sin zoom, sin flash, sin filtros. El instrumento centrado y entero, con
  espacio alrededor.

Son unas 70 fotos. Van a una carpeta aparte (`simiq3d-referencias/`), no al
dataset de SIVRI.

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
  - lo que se ve en 3D sale de la consulta del visor, con ids reales, nunca
    del texto.

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

Sugerencias para quien lo implemente:

- Modelo: **Qwen3-VL 8B instruct** (`qwen3-vl:8b-instruct`, unos 6 GB), en la
  RX 6600 XT al 100 % en la GPU. Comparado el 2026-10-27 con Qwen2.5 7B sobre
  las mismas 18 preguntas: respondió él mismo 14 (contra 13), con respuestas
  más completas (todas las ubicaciones de un instrumento, todos sus vecinos), y
  ninguno de los dos dejó pasar un dato falso; a cambio tarda más (mediana de
  3,9 s contra 2,4 s, máximo 6,7 s). La variante *instruct* y no la
  *thinking*: razonar antes de cada paso sumaría segundos. La elección final
  se hace con el banco de preguntas.
- La RX 6600 XT no está en la lista oficial de GPU AMD de Ollama: probar su
  backend Vulkan o `HSA_OVERRIDE_GFX_VERSION=10.3.0`; si ninguno funciona,
  corre en la CPU, más lento.
- El Servidor PC2 no se suspende y corre Ollama como servicio.

## Cómo se arma la mesa en 3D

Decidido por Mauricio el 2026-10-15. DataIQ dice en qué celda va cada objeto
(cuadrículas de distinto tamaño, dibujadas a mano), no dónde exactamente ni
hacia dónde apunta:

- **La cuadrícula se reparte en partes iguales sobre la mesa**, la misma regla
  de SIVRI: lo que el estudiante ve en 3D es lo que SIVRI le revisa.
- **La mesa, a su tamaño real:** el área entre los marcadores ArUco de la mesa
  del laboratorio, medida en la visita de las fotos, con su fuente anotada.
- **Los instrumentos, a escala real** (ver «Modelos 3D»), con **su centro
  en el centro de su celda**. Un instrumento suele ser más largo que una celda:
  sobresale hacia las vecinas, como en la mesa real. SIVRI mide igual: por el
  centro.
- **Hacia dónde apunta cada instrumento** sale de las fotos de las mesas bien
  armadas que toma el programa de IQ para SIVRI. Si todos siguen una misma
  regla, la regla vive en SIMIQ3D, como forma de presentar la mesa; si cambia
  de un instrumento a otro, es parte del arreglo y va en DataIQ (cambio de su
  esquema y de su editor).
- **Objetos compuestos:** el mango con su hoja es un solo modelo, con la hoja
  montada; dos instrumentos en la misma celda van uno al lado del otro, como
  muestren las fotos.

## Backend y base de datos

Decidido por Mauricio el 2026-10-15. El backend corre en Vercel (ver «Chat») y
tiene su propia base en Neon, en un proyecto aparte, como cada módulo:

| Qué | Dónde | Por qué |
|---|---|---|
| Mapeo de cada modelo 3D a su instrumento de DataIQ (`instruments.id`) | Base de SIMIQ3D | Ese mapeo es de SIMIQ3D, no de DataIQ, como las clases de YOLO en SIVRI. Los ids del catálogo cambian de una instalación a otra: el repo guarda el mapeo por nombre del instrumento (o un alias) y un comando lo traduce a ids en cada entorno con la API de DataIQ |
| Registro de las conversaciones: pregunta, acción elegida por el modelo y fecha | Base de SIMIQ3D | Sin él no hay cómo demostrar con números que el chat funciona (ver abajo) |
| Archivos de los modelos (GLB) | Archivos estáticos del frontend, en Vercel | Se descargan una vez y quedan en caché; en Neon gastarían su medio GB |
| Técnicas e instrumentos que el chat le ofrece al modelo | DataIQ, por `/catalog/full`, que el backend cachea por sesión | DataIQ es la única fuente de verdad |
| La mesa que dibuja el visor y la descripción de cada instrumento | DataIQ, que el frontend lee directo (`GET /techniques/{id}/instruments`, `GET /instruments`) | No pasa por el backend de SIMIQ3D: sería un salto más sin aportar nada, y el visor sigue funcionando sin el chat |

El registro de conversaciones:

- **Sin datos de quién pregunta**: no guarda la cuenta ni nada que identifique
  a la persona.
- Se recoge en las sesiones de evaluación y de la prueba piloto, donde los
  participantes dan su consentimiento informado (Resolución 8430 de 1993), y
  se borra al terminar la evaluación.
- La política de tratamiento de datos lo declara, con su finalidad
  (Ley 1581 de 2012).

## Cómo se evalúa

Decidido por Mauricio el 2026-10-15, con la metodología del proyecto: DSRM,
evaluada con FEDS. Para el MVP, lo que pide el Formato 115 más la métrica
técnica del chat; lo demás está en
[`docs/despues-del-mvp.md`](../docs/despues-del-mvp.md).

- **Evaluación formativa** (durante el desarrollo):
  - Un **banco de preguntas**, escrito por ING con ayuda de IQ antes de
    programar el chat, cada una con su acción correcta. Incluye sinónimos,
    errores de escritura, preguntas fuera de alcance («¿cómo se hace una
    apendicectomía?») e intentos de desviarlo («ignora tus instrucciones»):
    en esas el chat dice que no tiene la respuesta. Se corre solo cada vez
    que cambian el modelo o sus instrucciones.
  - La comparación de cada modelo 3D con sus fotos de referencia (silueta y
    medidas) y las pruebas automatizadas del backend.
- **Evaluación sumativa** (al final):
  1. **Exactitud del chat:** porcentaje de preguntas respondidas
     correctamente, sobre el banco y sobre el registro de las sesiones de
     evaluación; aparte, las respuestas inventadas (meta: ninguna) y cuántas
     respondió el modelo y cuántas las plantillas de respaldo.
  2. **Tiempo de respuesta:** desde la pregunta hasta que se ve la escena.
  3. **Visto bueno del programa de IQ** a cada modelo 3D.
  4. La **Escala de Usabilidad del Sistema (SUS)** y el cuestionario de
     pertinencia de la prueba piloto, que el Formato 115 aplica a todo el
     ecosistema.

El avance, por actividad de DSRM, está en
[`docs/checklist.md`](docs/checklist.md).

## Stack

El backend lo decide Guebriel, que lo desarrolla; el frontend, Juan
Caraballo, que lleva el frontend de los tres módulos. Requisito: **el visor
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
├── backend/
├── frontend/                  Angular + Three.js
├── models/                    .blend por familia, GLB por instrumento y sus medidas
└── docs/
    ├── checklist.md           avance por actividad de DSRM
    └── checklist-frontend.md  avance del frontend, por fases
```

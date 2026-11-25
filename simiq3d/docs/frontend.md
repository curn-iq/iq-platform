# El frontend de SIMIQ3D por dentro

Cómo está hecha la app del visor y el chat. Cómo se corre y se despliega:
[`../frontend/README.md`](../frontend/README.md).

## Decisiones

| Tema | Decisión |
|---|---|
| Tecnología | Angular 22 (standalone, signals, sin `zone.js`), TypeScript 6, SCSS y Vitest, como el shell y DataIQ |
| Visor 3D | Three.js usado directamente, sin envoltorios; se descarga solo al abrir el visor, así el chat aparece antes |
| Dónde corre | App aparte servida en `/simiq3d/`, en el mismo origen que el shell, para usar la misma cookie de sesión |
| Datos | La mesa y las descripciones salen directo de DataIQ; el backend de SIMIQ3D responde el chat y el mapeo de modelos (`GET /models`) |
| Modelos 3D | GLB comprimidos con meshopt (`gltfpack`) y servidos como archivos estáticos con caché |
| Presupuesto | Código inicial: aviso a los 300 KB y error a los 500 KB; el archivo del visor (con Three.js) hasta 900 KB; cada GLB por debajo de 150 KB |
| Seguridad | Cookie `HttpOnly` de DataIQ, `X-IQ-Client: web` en todas las peticiones y CSP estricta, sin `innerHTML` con datos de las APIs |

## Arquitectura

La misma separación que el frontend de DataIQ: solo `data/` sabe que existe
HTTP y solo `viewer/` sabe que existe Three.js. `domain/` no usa Angular, Three.js
ni las APIs, así que la geometría de la mesa se prueba sin navegador ni WebGL.
Las carpetas están en [`../frontend/README.md`](../frontend/README.md#estructura).

## El visor

Recibe la mesa ya calculada por `domain/` y la dibuja. Para que corra bien en un
celular modesto:

- Three.js se descarga aparte y solo con lo que se usa (`GLTFLoader`,
  `OrbitControls` y el decodificador de meshopt).
- Dibuja solo cuando algo cambia, no 60 veces por segundo, y con una resolución
  de hasta 2× la de la pantalla.
- Cada modelo se descarga una vez y se reutiliza entre técnicas; al cambiar de
  técnica se libera la memoria de la anterior.
- Tocar un instrumento lo resalta y muestra su ficha. La leyenda hace lo mismo
  y es la alternativa accesible a la escena. Sin WebGL, se dice y se ofrece la
  mesa en DataIQ.

## Cómo se arma la mesa en 3D

- **Posición y giro de DataIQ:** cada instrumento va a escala real, con el
  centro y el giro medidos en la foto de su mesa, y el giro ajustado al eje
  cardinal más cercano (`domain/placement.ts`). Si DataIQ solo trae celdas, el
  objeto va al centro de sus celdas.
- **Qué modelo va en cada objeto:** los componentes del objeto se buscan en
  `GET /models`; un componente sin modelo (una sutura) no se dibuja, pero sigue
  en la leyenda. La hoja de bisturí se cuelga del nodo `blade_mount` del mango.
- **Ordenada aunque en la foto haya piezas encimadas:** `domain/arrangement.ts`
  deja cada pieza entera sobre la mesa y a 3 mm de las demás, corriéndola lo
  justo por el lado en que menos se tapa. Los dos Farabeuf van de canto y
  abrazados, como en las fotos.
- **La mesa** tiene un tamaño provisional, el mismo para todas las técnicas
  (`MAYO_TABLE_SIZE` en `domain/mayo-table.ts`). Unidades en metros, Y hacia
  arriba.

La fuente de las posiciones y su sistema de coordenadas:
[catálogo de DataIQ](../../dataiq/docs/catalogo.md#posición-métrica-de-los-instrumentos).

## El chat

La pregunta va a `POST /api/simiq3d/chat/stream` con la técnica abierta y las
tres preguntas anteriores, para que un seguimiento («¿y para qué sirve?») se
entienda. La respuesta llega a medida que se escribe, una línea JSON por evento:
`start` (lo que hace el visor), cada `text` y `end` (la respuesta completa).

El texto viene en Markdown sencillo (párrafos, negrita y listas) y se dibuja sin
`innerHTML` (`chat/rich-text.ts`). Lo que hace el visor depende de `action`;
los ids son de DataIQ y el visor nunca saca nada del texto:

| `action` | En el visor |
|---|---|
| `show_technique` | Abre la mesa de la técnica |
| `highlight_instrument` | Viaja al instrumento y lo resalta |
| `describe_instrument` | Lo resalta y abre su ficha |
| `show_clinical_data` | Abre la mesa; el dato va en el texto |
| `list_instruments` | Abre la mesa y, bajo el texto, la lista de sus objetos |
| `answer`, `clarify`, `no_answer` | Nada: la respuesta es solo texto |

Cómo decide el chat qué responder: [`chat.md`](chat.md). La disposición de la
pantalla y sus tokens: «SIMIQ3D: Quirófano ligero» en
[`design/README.md`](../../design/README.md).

## Modelos 3D

`npm run models` comprime los GLB de [`../models/`](../models/README.md) con
`gltfpack` y los deja en `public/models/` (generado, no se versiona). Cada modelo
se publica con una huella de su contenido en el nombre y se guarda en caché un
año; el índice `manifest.json` se revalida en cada visita, así que un modelo
actualizado nunca queda viejo en el navegador.

## Rutas

| Ruta | Qué muestra |
|---|---|
| `/simiq3d` | El chat con sugerencias y la escena vacía |
| `/simiq3d/tecnicas/:id` | La mesa de Mayo de esa técnica; es el destino de «Ver en 3D» en DataIQ |

Las dos piden cuenta: sin sesión se va al ingreso del shell
(`/cuenta/ingresar?volver=/simiq3d/…`), y una sesión que vence mientras se usa la
app lleva al mismo lugar.

## Errores de las APIs

| Error | Qué se muestra |
|---|---|
| 401 | El ingreso del shell, para volver a donde se estaba |
| 503 «El chat no está disponible» | El chat como no disponible; el visor sigue funcionando |
| 503 «DataIQ no responde» | Se dice y se puede volver a preguntar |
| 429 | El tope de preguntas seguidas por cuenta (30 cada 10 minutos) |
| 422 | Pregunta vacía o de más de 500 caracteres; el campo no deja enviarla |

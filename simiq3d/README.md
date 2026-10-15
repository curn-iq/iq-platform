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

Decidido por Mauricio el 2026-10-15: **modelos propios, hechos en Blender con
Claude**. Blender es gratis para cualquier uso y lo que se crea con él es de
quien lo hace, así que los modelos pueden ir en el repo y servirse en la web.

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

- **Referencias:** fotos del instrumental real del programa de IQ (ver
  «Fotos de referencia»).
- **Herramienta** (decidida por Mauricio el 2026-10-15): la skill
  [blender-image-to-3d](https://github.com/majidmanzarpour/blender-game-skills)
  (MIT) en Claude Code. Construye el modelo por fases a partir de las fotos y
  pasa cada fase solo si el render coincide con la foto en números (silueta y
  proporciones), no a ojo; exporta GLB y lo vuelve a importar para
  comprobarlo. Corre Blender sin ventana; [Blender
  MCP](https://github.com/ahujasid/blender-mcp) es opcional, para retocar en
  vivo. Sus fases de esqueleto y animación no aplican a instrumentos.
- **Cada modelo sale de un script** de Blender guardado en el repo: se puede
  volver a generar, revisar en un PR y corregir cambiando una medida. Cada
  medida dice de qué foto salió, o queda marcada como inferida.
- **IQ valida cada modelo**, como valida los datos de DataIQ.

### Fotos de referencia

Se toman en la primera visita al laboratorio para el dataset de SIVRI
([`sivri/docs/dataset.md`](../sivri/docs/dataset.md)), con el mismo pedido al
programa de IQ, pero son otras fotos: cada instrumento solo, no la mesa.

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

- **El modelo elige acciones, los datos salen de DataIQ** (*tool calling*). El
  modelo no responde con lo que sabe: convierte la pregunta en una acción
  («muéstrame la mesa de mastectomía» → mostrar la técnica; «¿dónde va la
  Kelly?» → resaltar el instrumento; «¿qué es una Babcock?» → describirlo), y
  el texto y la escena salen de DataIQ. Si se equivoca, muestra otra técnica,
  pero no inventa un dato. Por eso basta un modelo pequeño.
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

- Modelo: de la familia **Qwen3** (p. ej. Qwen3 8B comprimido, unos 5 GB),
  la más recomendada para *tool calling* en 8 GB. Se elige probando con las
  acciones reales del chat, no por tablas de comparación.
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
- **Los instrumentos, a escala real** (de las fotos con regla), con **su centro
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
| Mapeo de cada modelo 3D a su instrumento de DataIQ (`instruments.id`) | Base de SIMIQ3D | Ese mapeo es de SIMIQ3D, no de DataIQ, como las clases de YOLO en SIVRI |
| Registro de las conversaciones: pregunta, acción elegida por el modelo y fecha | Base de SIMIQ3D | Sin él no hay cómo demostrar con números que el chat funciona (ver abajo) |
| Archivos de los modelos (GLB) | Archivos estáticos del frontend, en Vercel | Se descargan una vez y quedan en caché; en Neon gastarían su medio GB |
| Técnicas, mesas e instrumentos | DataIQ, por `/catalog/full`, una vez por sesión | DataIQ es la única fuente de verdad |

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
  - Los controles de la skill sobre cada modelo 3D (silueta y proporciones
    frente a la foto) y las pruebas automatizadas del backend.
- **Evaluación sumativa** (al final):
  1. **Exactitud del chat:** porcentaje de preguntas convertidas en la acción
     correcta, sobre el banco y sobre el registro de las sesiones de
     evaluación. Meta: ninguna respuesta inventada.
  2. **Tiempo de respuesta:** desde la pregunta hasta que se ve la escena.
  3. **Visto bueno del programa de IQ** a cada modelo 3D.
  4. La **Escala de Usabilidad del Sistema (SUS)** y el cuestionario de
     pertinencia de la prueba piloto, que el Formato 115 aplica a todo el
     ecosistema.

El avance, por actividad de DSRM, está en
[`docs/checklist.md`](docs/checklist.md).

## Stack

Lo decide Guebriel, que desarrolla SIMIQ3D, con un requisito: **el visor corre
en el navegador, sin instalar nada** (WebGL), como lo fundamenta el Formato 115
en su marco teórico.

- **Backend: Python + FastAPI**, como DataIQ y SIVRI (confirmado por Guebriel
  el 2026-10-15). Reutiliza lo que ya funciona: la validación del JWT de DataIQ con su clave pública (JWKS), la
  arquitectura hexagonal, SQLAlchemy y Alembic contra su base en Neon, el
  despliegue en Vercel como funciones de Python (detrás de `/api/simiq3d/*`,
  donde le llega la cookie de sesión) y el flujo de GitHub Actions. Un backend
  en otro lenguaje obligaría a rehacer todo eso.

Por definir, con esta sugerencia por compatibilidad con el resto del
ecosistema:

- **Visor 3D: Three.js** (o Babylon.js), en la web. Lee GLB, el formato que
  exportan los modelos; corre en el navegador del celular sin instalar nada; y
  se sirve desde el mismo origen que el shell, para usar la misma sesión. Unity
  exportado a la web carga su propio motor (varios MB antes de mostrar nada),
  tarda más en un celular y queda aislado del shell.
- **Frontend: Angular**, como el shell, si se quieren reutilizar sus
  componentes y su sistema visual; Three.js funciona con cualquier framework.

## Estructura

```
simiq3d/
├── backend/
├── frontend/
└── docs/
    └── checklist.md   avance por actividad de DSRM
```

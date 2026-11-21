# Desarrollo del módulo SIMIQ3D

## Qué lleva

- Arquitectura: el visor 3D y el chat, y cómo leen DataIQ.
- El chat como agente: consulta DataIQ, redacta la respuesta y se verifica
  contra los datos; sus controles y el riesgo aceptado.
- Los modelos 3D: construidos en Blender con scripts, con asistentes de IA,
  sobre las fotos del programa de IQ y referencias del instrumental, y
  aprobados uno por uno por el equipo; y cómo se colocan en la mesa con las
  posiciones medidas.
- El registro anónimo de conversaciones.

## Fuentes en el repositorio

- [`simiq3d/README.md`](../../../simiq3d/README.md), incluida «Cómo se arma la
  mesa en 3D».
- [`simiq3d/backend/README.md`](../../../simiq3d/backend/README.md).
- [`simiq3d/models/README.md`](../../../simiq3d/models/README.md) y
  `simiq3d/models/modelos.csv` (medidas y fuente de cada modelo).

## Texto

SIMIQ3D lo planificó Mauricio Lugo el 2026-10-15 con un alcance igual al de
SIVRI: la mesa de Mayo de las cinco técnicas de Cirugía General de DataIQ.
Mauricio Lugo desarrolló el backend, el frontend y el modelado 3D, con
asistencia de Claude Code y, en el modelado, también de Codex. El primer
juego de modelos 3D lo hizo Guebriel Garces.

### El chat

El backend del chat (2026-10-27) consulta DataIQ y responde; el modelo de
lenguaje corre en el Servidor PC2. Su diseño cambió dos veces a partir de las
pruebas:

1. **Pedidos** (2026-11-03): el modelo convertía la pregunta en una consulta y
   unas plantillas redactaban la respuesta. Al probarlo en producción, Mauricio
   Lugo encontró que el chat no conversaba: quedaba demasiado limitado.
2. **Tutor** (2026-11-04, el diseño vigente): el código decide de qué se habla
   y qué datos de DataIQ recibe el modelo; el modelo redacta la respuesta en
   una sola llamada, y cada frase se revisa contra los límites acordados (la
   mesa según DataIQ, nada de ordenar por tiempos quirúrgicos, ni dosis, ni
   cuadrícula). Una frase que cruza un límite se cambia por el dato de DataIQ,
   nunca se descarta en silencio. La respuesta aparece a medida que se
   escribe.

La exactitud del chat se mide con un banco de preguntas (`eval/banco.csv`)
que incluye preguntas directas, sinónimos, paráfrasis, errores de escritura,
seguimientos, preguntas ambiguas, fuera de alcance e intentos de desviarlo.
Durante el desarrollo, el banco guió las correcciones: la exactitud pasó de
79,5 % a 100 % sobre el banco de desarrollo el 2026-10-30 (evaluación
formativa). Las conversaciones se guardan en un registro anónimo, sin la
cuenta de quien pregunta.

### El frontend

El frontend (2026-11-02) muestra la mesa de Mayo en 3D con Three.js y el chat
al lado. El 2026-11-05 se rediseñó con la dirección visual «Quirófano ligero»:
la mesa a pantalla completa, el chat como panel flotante en escritorio y como
panel inferior en celular, y la barra superior compartida con DataIQ. Se
probó en computador, celular y tableta.

### Los modelos 3D

**Primer juego de modelos.** Guebriel Garces modeló a mano en Blender los 23
instrumentos que tenían entonces las cinco mesas de Cirugía General, y los
integró al repositorio el 2026-10-30: un archivo fuente de Blender por familia
(bisturí, disección, pinzas, separadores y tijeras) y un modelo GLB por
instrumento, optimizado para el visor web (en metros, con el eje largo sobre X
y la punta hacia +X, y menos de unos 700 triángulos por modelo). Las medidas
salieron del catálogo de instrumental del Comité Internacional de la Cruz Roja
(CICR); lo que el catálogo no traía (anillos, mandíbulas, curvaturas,
espesores, dientes, y por completo la Kelly, la Kelly Adson, la Moynihan, la
Lahey, el mango N.° 7 y las hojas) se infirió y quedó registrado como inferido
en `simiq3d/models/modelos.csv`. Con ese juego de modelos SIMIQ3D se puso en
producción el 2026-11-02 y se presentó al programa de IQ el 2026-11-05.

**Modelos sobre las fotos del laboratorio.** El 2026-11-05, en la presentación a las estudiantes de Instrumentación
Quirúrgica, su tutora señaló que el instrumental de los modelos no era del todo
correcto. El 2026-11-18 el equipo fotografió en el laboratorio las mesas
armadas de las cinco técnicas, y entre el 2026-11-20 y el 2026-11-21 se
rehicieron los 16 instrumentos sobre esas fotos (Fig. del catálogo de 16
modelos).

El método, el mismo para cada instrumento:

1. La foto se endereza con los cuatro marcadores ArUco y se pone a escala con
   su cuadrado negro de 6 cm.
2. Se traza el contorno del instrumento sobre la foto y se extruye con su
   ancho real (Fig. de la Rochester, foto y modelo). El espesor, que una foto
   cenital no muestra, se infiere y se registra como inferido.
3. Los detalles que la foto no deja ver (dientes, estrías, puntas) se toman de
   imágenes de referencia del instrumental que aportó Mauricio Lugo.
4. Mauricio Lugo revisa cada modelo contra la foto y las referencias, pide las
   correcciones y lo aprueba. Entre sus criterios: las pinzas y tijeras
   ligeramente abiertas, con mangos, cremallera y mandíbulas abriéndose a la
   vez; el ancho variable real, no barras de ancho fijo; y la dirección real
   de cada curva (la Kelly Adson y la Moynihan curvan hacia abajo, no hacia un
   lado).
5. Se exporta un GLB por instrumento, en metros y con menos de 2000
   triángulos, y se registran sus medidas y su fuente en
   `simiq3d/models/modelos.csv`.

En la revisión final con Codex se rehicieron 11 modelos y se conservaron 5.

### La mesa en el visor

Cada instrumento se coloca con la posición y el giro medidos en DataIQ,
alineado al eje cardinal más cercano para que la mesa se vea ordenada; ninguna
pieza tapa a otra ni sale del paño, y los dos separadores de Farabeuf se
muestran abrazados, como en las fotos (Fig. de las cinco mesas). El acero de
los instrumentos usa la oclusión ambiental horneada en cada modelo y una
sombra de contacto, para que se distinga sobre el paño (Fig. de antes y
después). Cada modelo se publica con una huella de su contenido en el nombre,
de modo que un modelo actualizado no se queda en la caché del navegador.

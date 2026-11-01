# Modelos 3D de SIMIQ3D

23 instrumentos de las cinco mesas de Cirugía General, un GLB por instrumento y
un `.blend` por familia. Los archivos de esta carpeta son los assets que consume
el visor 3D de SIMIQ3D.

## Archivos

| Archivo | Qué es |
|---|---|
| `glb/*.glb` | Un modelo por instrumento, exportado de Blender sin comprimir; `npm run models` del frontend los comprime para el visor web |
| `blender/*.blend` | Archivos fuente de Blender, organizados por familia |
| `modelos.csv` | Instrumento, archivo GLB, medidas principales, fuente y notas |

`modelos.csv` es también el mapeo de cada modelo a su instrumento: la columna
`instrumento` lleva el nombre del instrumento en DataIQ (o uno de sus alias) y
`archivo`, su GLB. El backend las carga con
`uv run python -m app.adapters.inbound.cli.load_models`, que traduce cada
nombre a su id en el DataIQ de ese entorno (los ids cambian de una instalación
a otra) y deja la tabla `model_mappings` igual al archivo.

## Convenciones

- Escala real, en metros (la unidad de glTF).
- Un GLB por instrumento, con nombre en inglés (`kelly_forceps.glb`), como el
  resto del código.
- Origen en el centro del instrumento visto desde arriba y a la altura de su
  punto más bajo: el visor lo pone sobre la mesa sin calcular nada. Las hojas
  de bisturí son la excepción (ver «Mango y hoja»).
- Eje largo sobre X, punta hacia +X. Z arriba en Blender; el exportador lo pasa
  a Y arriba en el GLB.
- Pocos polígonos: ninguno pasa de unos 2.000 triángulos.
- Cada instrumento va cerrado y plano, como en la mesa.
- Dos piezas de un mismo modelo nunca tienen una cara visible a la misma
  altura: en el navegador, dos caras superpuestas en el mismo plano parpadean.
  Por eso cada pieza tiene un grosor apenas distinto (1 % entre una y otra).

## Mango y hoja

En DataIQ, el mango de bisturí y su hoja son un solo objeto de la mesa («Mango
de bisturí N.° 4 y Hoja de bisturí #20»), pero cada uno tiene su GLB, porque un
mismo mango recibe distintas hojas. Se arman así:

- Cada mango trae un nodo vacío, `blade_mount`, al comienzo de su riel (el
  relieve del encaje donde entra la ranura de la hoja) y a la altura de la cara
  de arriba del encaje.
- Cada hoja tiene su origen en el talón (el extremo de la ranura, hacia −X), a
  la altura de su cara de abajo.
- El visor cuelga la hoja del nodo `blade_mount` de su mango, sin moverla ni
  girarla, y queda montada: el riel dentro de la ranura y la hoja apoyada en el
  encaje.

Los mangos N.° 3 y N.° 7 tienen el mismo encaje, porque reciben las mismas
hojas (N.° 10, 11, 12 y 15); el N.° 4, uno más grande, para las hojas N.° 20 a
22. La ranura de cada hoja mide lo que el riel de su mango, con 0,25 mm de
juego en cada extremo.

## Qué es real y qué es inferido

Cada fila de `modelos.csv` dice de dónde sale cada medida.

- **Del catálogo del CICR:** el largo total de los instrumentos que están allí
  (la ficha ofrece varios largos; la columna `notas` dice cuál se modeló), el
  ancho de las mandíbulas del Babcock y las hojas del Farabeuf.
- **De las fuentes de la descripción en DataIQ** (columna `fuentes_descripcion`
  de `dataiq/backend/seed/tecnicas.xlsx`): el largo de Kelly Adson, Moynihan y
  Lahey, y la mandíbula de 30 mm de la Kelly Adson, para que el modelo coincida
  con lo que lee el estudiante al tocarlo.
- **De la descripción en DataIQ:** que el mango N.° 7 tenga el encaje del
  N.° 3 (recibe las mismas hojas) y que la hoja #20 tenga la forma de la #10 a
  mayor tamaño.
- **Inferido:** todo lo demás (anillos, mandíbulas, curvatura, espesores,
  dientes, cremallera, encajes y ranuras), y por completo Kelly, el mango N.° 7
  y las hojas, que no están en el catálogo.

Las fotos propias de cada instrumento, con medidas exactas, son para después
del MVP ([`docs/despues-del-mvp.md`](../../docs/despues-del-mvp.md)).

## Simplificaciones

- Los instrumentos no se abren: las dos mitades de pinzas y tijeras no se
  modelan por separado.
- La ranura de las hojas de bisturí es rectangular; la real tiene forma de ojo
  de cerradura.
- La hoja #10-11 tiene la forma de la #10: la fuente nombra las dos sin decir
  cuál lleva la mesa.
- Las mandíbulas no tienen estrías. En una pinza cerrada, las estrías están en
  las caras que se tocan y no se ven; por eso la Kelly (estrías hasta la mitad),
  la Kelly Adson (dos tercios) y la Rochester (todo el largo) se distinguen en
  el modelo por su tamaño, no por sus estrías.
- La cremallera son dos lengüetas planas, una de cada rama, junto a los
  anillos, con los dientes trabados en el centro; en la real, las lengüetas se
  superponen y los dientes quedan entre ellas.
- Los dientes (Kocher, Allis, Lahey, pinza de disección con garra) se muestran
  sobre la punta, y en menor número que en la real (p. ej. 2 por rama en la
  Lahey, que tiene 3); en la real quedan entrelazados por dentro.
- La pinza de disección es una sola barra plana; las dos ramas no se modelan
  por separado.
- Farabeuf y Senn Miller son de doble extremo: la hoja grande va hacia +X.

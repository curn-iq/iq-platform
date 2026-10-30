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
- Origen en el centro del instrumento.
- Eje largo sobre X, punta hacia +X. Z arriba en Blender; el exportador lo pasa
  a Y arriba en el GLB.
- Pocos polígonos: ninguno pasa de unos 1.900 triángulos.
- Cada instrumento va cerrado y plano, como en la mesa.

## Qué es real y qué es inferido

Cada fila de `modelos.csv` dice de dónde sale cada medida.

- **Del catálogo del CICR:** el largo total de los instrumentos que están allí
  (la ficha ofrece varios largos; la columna `notas` dice cuál se modeló), el
  ancho de las mandíbulas del Babcock y las hojas del Farabeuf.
- **De las fuentes de la descripción en DataIQ** (columna `fuentes_descripcion`
  de `dataiq/backend/seed/tecnicas.xlsx`): el largo de Kelly Adson, Moynihan y
  Lahey, y la mandíbula de 30 mm de la Kelly Adson, para que el modelo coincida
  con lo que lee el estudiante al tocarlo.
- **Inferido:** todo lo demás (anillos, mandíbulas, curvatura, espesores,
  dientes), y por completo Kelly, el mango N.° 7 y las hojas, que no están en
  el catálogo.

Las fotos propias de cada instrumento, con medidas exactas, son para después
del MVP ([`docs/despues-del-mvp.md`](../../docs/despues-del-mvp.md)).

## Simplificaciones

- Los instrumentos no se abren: las dos mitades de pinzas y tijeras no se
  modelan por separado.
- La ranura de las hojas de bisturí es rectangular; la real tiene forma de ojo
  de cerradura.
- Los dientes (Kocher, Allis, Lahey, pinza de disección con garra) se muestran
  sobre la punta, y en menor número que en la real (p. ej. 2 por rama en la
  Lahey, que tiene 3); en la real quedan entrelazados por dentro.
- La pinza de disección es una sola barra plana; las dos ramas no se modelan
  por separado.
- Farabeuf y Senn Miller son de doble extremo: la hoja grande va hacia +X.

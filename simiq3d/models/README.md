# Modelos 3D de SIMIQ3D

23 instrumentos de las cinco mesas de Cirugía General, un GLB por instrumento y
un `.blend` por familia. Los archivos de esta carpeta son los assets que consume
el visor 3D de SIMIQ3D.

## Archivos

| Archivo | Qué es |
|---|---|
| `*.glb` | Modelos optimizados para cargar en el visor web |
| `*.blend` | Archivos fuente de Blender, organizados por familia |
| `modelos.csv` | Instrumento, archivo GLB, medidas principales, fuente y notas |

## Convenciones

- Escala real, en metros.
- Origen en el centro del instrumento.
- Eje largo sobre X, punta hacia +X. Z arriba en Blender; el exportador lo pasa
  a Y arriba en el GLB.
- Pocos polígonos: ninguno pasa de unos 700 triángulos.
- Cada instrumento va cerrado y plano, como en la mesa.

## Qué es real y qué es inferido

Cada fila de `modelos.csv` dice de dónde sale cada medida.

- **Del catálogo del CICR:** el largo total de los instrumentos que están allí
  (la ficha ofrece varios largos; la columna `notas` dice cuál se modeló), el
  ancho de las mandíbulas del Babcock y las hojas del Farabeuf.
- **Inferido:** todo lo demás (anillos, mandíbulas, curvatura, espesores,
  dientes), y por completo Kelly, Kelly Adson, Lahey, Moynihan, el mango N.° 7 y
  las hojas, que no están en el catálogo.

Se pueden afinar con las fotos de referencia de IQ (una regla milimetrada junto
a cada instrumento) y actualizar el modelo fuente correspondiente.

## Simplificaciones

- Los instrumentos no se abren: las dos mitades de pinzas y tijeras no se
  modelan por separado.
- La ranura de las hojas de bisturí es rectangular; la real tiene forma de ojo
  de cerradura.
- Los dientes (Kocher, Kelly Adson, Allis, Lahey, pinza de disección con garra)
  se muestran sobre la punta; en la real quedan entrelazados por dentro.
- La pinza de disección es una sola barra plana; las dos ramas no se modelan
  por separado.
- Farabeuf y Senn Miller son de doble extremo: la hoja grande va hacia +X.

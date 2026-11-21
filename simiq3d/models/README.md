# Modelos 3D de SIMIQ3D

Los 16 instrumentos de las cinco mesas de Cirugía General se reconstruyeron
sobre las fotos de IQ del 2026-11-18, por decisión de Mauricio. Cada fila de
`modelos.csv` registra la foto o referencia, las medidas y lo que se infirió.

| Archivo | Contenido |
|---|---|
| `glb/*.glb` | Un modelo por instrumento. El frontend los comprime con `npm run models`. |
| `blender/*.blend` | Un archivo de Blender por instrumento. |
| `modelos.csv` | Identificación, dimensiones, fuentes y notas. |

El backend carga el mapeo con
`uv run python -m app.adapters.inbound.cli.load_models`. Lee los nombres o alias
de `modelos.csv`, busca los identificadores en DataIQ del mismo entorno y
reemplaza la tabla `model_mappings` completa en una transacción.

## Convenciones

- Escala real en metros, origen centrado en planta y a la altura del punto
  más bajo. El eje largo va en X con la punta hacia +X. El exportador cambia
  Z arriba en Blender por Y arriba en glTF.
- Menos de 2000 triángulos por modelo. Pinzas y tijeras ligeramente abiertas
  con sus detalles de prensión. Cada fila documenta la forma específica.
- Se hornea oclusión ambiental por vértice. El visor sustituye el material
  original por acero satinado y utiliza el atributo de color del GLB.
- Los mangos N.° 3 y N.° 4 se publican sin hojas. El nodo `blade_mount` marca
  el encastre. Si una pieza carece de GLB, se omite su geometría en el visor.

La colocación de cada pieza se documenta en el
[README de SIMIQ3D](../README.md#cómo-se-arma-la-mesa-en-3d).

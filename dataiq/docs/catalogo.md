# El catálogo de DataIQ

De dónde salen los datos de las mesas y cómo se cargan. El catálogo completo
está en [`backend/seed/tecnicas.xlsx`](../backend/seed/tecnicas.xlsx): 18
técnicas de cinco especialidades, con la columna `origen` de cada dato (tomado
de los documentos del programa de IQ, corregido o propuesto). Se carga con
`uv run python -m seed.load` ([`backend/README.md`](../backend/README.md#correrlo)).

## Mesas de Mayo de Cirugía General

A partir de las listas de IQ y las fotos
del 2026-11-18. En `seed/tecnicas.xlsx`, las cinco mesas de Mayo usan una
cuadrícula vertical de 10 filas por 6 columnas. Se proyecta el centro de
cada caja etiquetada sobre el rectángulo entre los centros de los cuatro
marcadores y se amplía cada eje un 10 % por lado. Cada objeto ocupa la unión
de las celdas observadas en las tres rondas «Bien Armada». Se numera por su
primera celda, de arriba abajo y de izquierda a derecha. No hubo choques
entre objetos.

Las tijeras de Mayo y Metzenbaum y los mangos 3 y 4 forman el objeto de
abajo, en orden libre. Las dos Kelly y los dos mosquitos de Tiroidectomía
se registran una vez por clase. Se agrupan las dos disecciones y se usa
«Pinza Mosquito curva», el nombre del catálogo. En Tiroidectomía, Babcock
reemplaza a Lahey. El mango 4 y la disección, vistos en las fotos de esa
técnica, quedan marcados «para confirmar con IQ» en el texto de la fuente.

## Posición métrica de los instrumentos

DataIQ es la fuente de la colocación fina.
La hoja `posiciones` de `seed/tecnicas.xlsx` identifica cada componente
por técnica, mesa, número e instrumento. Guarda el centro en centímetros
desde el centro del marco calibrado y el giro desde +X hacia +Z, en grados.
La carga convierte las posiciones a metros. El catálogo y el detalle de la
técnica devuelven `position_x_m`, `position_z_m` y `yaw_deg` en cada
componente. Los campos pueden ser nulos, en cuyo caso sigue disponible la
colocación por celdas. Los datos con oclusión visual o una identificación
incierta se indican como «propuesto» en la columna `origen`. La columna
`ejemplar` distingue instrumentos iguales que se ven en sitios distintos.
El catálogo devuelve los ejemplares posteriores en `additional_placements`
dentro del mismo componente.

## Publicar las mesas actualizadas en una base existente

Desde `dataiq/backend`, selecciona el entorno con `DATABASE_URL`.
`uv run python -m seed.update_mayo` muestra las cinco mesas y las versiones
que se publicarían. Con `--apply`, el comando publica en una transacción
una versión nueva por técnica que necesite el cambio: la mesa de Mayo, la
posición medida de cada instrumento (`position_x_m`, `position_z_m`,
`yaw_deg` y `additional_placements`) y la fuente de la técnica (`source`),
que cita de dónde sale esa mesa. Es el camino para llevar las posiciones a
una base que ya tiene las técnicas publicadas: `seed.load` es para la carga
inicial. Conserva el
historial y el resto del contenido publicado, y se detiene si alguna
técnica por actualizar tiene un borrador o una versión en revisión. Se puede
ejecutar nuevamente para comprobar que las cinco mesas coinciden con el
Excel.

# Desarrollo del módulo SIVRI

## Qué lleva

- Arquitectura: el backend en el Servidor PC1 y el detector YOLO.
- El dataset propio: protocolo de fotos, etiquetado y división por ronda.
- La lógica de validación de la mesa: cada instrumento en su celda, por el
  centro de su caja, con los marcadores ArUco.

## Fuentes en el repositorio

- [`sivri/README.md`](../../../sivri/README.md).
- [`sivri/docs/dataset.md`](../../../sivri/docs/dataset.md).
- [`sivri/backend/README.md`](../../../sivri/backend/README.md).

## Texto

SIVRI lo planificó Mauricio Lugo el 2026-10-13 con el alcance de la mesa de
Mayo de las cinco técnicas de Cirugía General y un dataset propio. Mauricio
Lugo desarrolló el backend, el dataset y el detector, con asistencia de Claude
Code y de Codex.

### Backend

El backend (2026-11-19) recibe la foto de la mesa (`POST /validate`) o un video
continuo (`WS /ws/validate`), detecta el instrumental con YOLO26 y valida la
mesa contra la técnica de DataIQ. Corre en el Servidor PC1 (decidido por
Mauricio Lugo el 2026-11-18). Cada clase del detector es un instrumento del
catálogo de DataIQ, mapeado por nombre o alias.

La validación es independiente del detector: los cuatro marcadores ArUco de
las esquinas dan la cuadrícula de la mesa, cada instrumento se empareja con su
posición esperada (algoritmo húngaro) y se juzga por el centro de su caja, con
un margen en los bordes. El resultado dice qué falta, qué sobra y qué está mal
ubicado, con la zona de la mesa, los instrumentos vecinos y el número del
diagrama; nunca con filas ni columnas, porque la mesa real no tiene
cuadrícula.

### Dataset

El 2026-11-18 el equipo fotografió en el laboratorio las mesas de Mayo de las
cinco técnicas, en tres rondas, con los marcadores ArUco en las esquinas. En
cada ronda se fotografió la mesa bien armada, dos variantes con errores puestos
al azar y la mesa en desorden: 125 fotos en total (45 bien armadas, 30 con el
error A, 30 con el error B y 20 en desorden). La división respeta las rondas:
la Ronda 1 entrena (55 fotos), la Ronda 2 valida (35) y la Ronda 3 prueba (35).

### Etiquetado y corrección de las cajas

Las cajas se etiquetaron el 2026-11-19 con asistencia de Claude Code, de forma
semiautomática: en la foto enderezada con los marcadores, las cajas de una
foto se propagaron a las parecidas y se revisaron a mano las que cambiaban (Fig.
de las etiquetas de Tiroidectomía). La revisión del 2026-11-21 encontró dos
problemas, que se corrigieron:

1. **Los mangos de bisturí N.° 3 y N.° 4 estaban intercambiados** en las 125
   fotos. Se corrigieron con asistencia de Claude Code, con respaldo de las
   etiquetas anteriores.
2. **Algunas cajas no cubrían el instrumento entero.** Con asistencia de Codex
   se comparó cada una de las 1374 cajas con la máscara del modelo de
   segmentación SAM 2.1 (Fig. de la revisión con SAM). Con asistencia de
   Claude Code se ampliaron las 79 cajas en que el instrumento seguía por fuera
   del borde, sin achicar ninguna; Mauricio Lugo revisó las ampliaciones antes
   de aplicarlas (Fig. de las cajas ampliadas).

El 2026-11-21 Mauricio Lugo decidió separar la pinza de disección con garra y
la sin garra en dos clases, para que el detector las distinga, y asignar a cada
instrumento la celda donde cae su posición medida. Al probar el frontend con
las fotos «Bien armada» aparecían indicaciones de mover piezas bien puestas,
porque las celdas salían de una sola foto por técnica y el programa de IQ no
armó la mesa igual en cada ronda. El 2026-11-23 Mauricio Lugo decidió
recalcularlas con las fotos «Bien armada» de las tres rondas: cada instrumento
suma las celdas vecinas donde también se puso, y con las cajas anotadas las
indicaciones falsas de mover bajaron de 49 a 18 (`sivri/backend/README.md`).
Ese mismo día se corrigió el reconocimiento de la técnica, que ahora descuenta
los instrumentos que sobran para cada una.

### Detector

La primera corrida (`sivri-r1`, 2026-11-19) entrenó YOLO26n en CPU durante 120
épocas, con entrada de 640 px. Como esa corrida usó las etiquetas con los
mangos intercambiados y las cajas cortas, el 2026-11-21 se completó `sivri-r2` con
1487 cajas, 16 clases y la misma división por ronda. Se eligieron los pesos
con la Ronda 2. Las dos disecciones tienen cajas individuales en las 125 fotos.

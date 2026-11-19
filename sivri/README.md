# SIVRI

Sistema Inteligente de Visión y Retroalimentación para Instrumentación Quirúrgica.

Reconoce el instrumental quirúrgico con la cámara (YOLO26) y valida si su
disposición en la mesa es la de la técnica reconocida, según el arreglo publicado
en DataIQ. Le dice al estudiante qué está bien y qué no. Valida por técnica, no
por tiempo quirúrgico.

## Alcance del MVP

- **Qué valida:** la **mesa de Mayo** de las cinco técnicas de **Cirugía
  General** de DataIQ (Colecistectomía, Eventrorrafia, Hemicolectomía derecha,
  Mastectomía y Tiroidectomía). Cada una tiene entre 9 y 12 objetos.
- **Qué reconoce:** los instrumentos de esas mesas (lista en
  [`docs/dataset.md`](docs/dataset.md)). Cada clase del modelo es un
  instrumento del catálogo de DataIQ.
- **De dónde salen las imágenes:** un dataset propio, con fotos de las mesas
  reales tomadas por el programa de Instrumentación Quirúrgica y etiquetadas
  por el equipo de ING, publicado en Kaggle. La captura del 2026-11-18 se dividió por ronda completa en
  entrenamiento, validación y prueba. Detalle y protocolo de fotos en
  [`docs/dataset.md`](docs/dataset.md).
- **Cómo reconoce:** en tiempo real sobre el video de la cámara (decidido por
  Mauricio el 2026-10-13). El celular muestra el video en vivo y envía 2 o 3
  cuadros por segundo, reducidos, al backend de SIVRI; el backend reconoce los
  instrumentos con YOLO26, compara con el arreglo de DataIQ y responde, y el
  celular dibuja el resultado sobre el video. Corre en CPU, sin GPU, como pide
  el Formato 115 («sin requerir infraestructura especializada»). Así, el modelo
  que se evalúa en la tesis es el mismo que usan los estudiantes, y todos
  reciben la misma calidad sin importar su celular. Las imágenes se procesan y
  no se guardan. Conviene usarlo con wifi: con datos móviles, una práctica de
  30 minutos gasta del orden de 180 MB (estimación sin medir).
- **Qué consume de DataIQ:** el arreglo publicado de cada técnica (objetos,
  mesas con su tamaño y celdas) por su API, nunca de su base de datos.

## Metodología

La del proyecto de grado: DSRM (Peffers et al.), evaluada con FEDS (Venable et
al.). En SIVRI:

- **Evaluación formativa** (durante el desarrollo): las métricas de validación
  de cada entrenamiento y las pruebas automatizadas de la lógica que compara la
  mesa detectada con la de DataIQ.
- **Evaluación sumativa** (al final): mAP@0.5, mAP@0.5:0.95, precisión y
  exhaustividad sobre un **conjunto de prueba que el modelo no vio** en ningún
  momento; después, la Escala de Usabilidad del Sistema (SUS) y la prueba
  piloto con estudiantes y docentes.

El avance, por actividad de DSRM, está en
[`docs/checklist.md`](docs/checklist.md).

## Stack

- Visión artificial: YOLO26 (Ultralytics, licencia AGPL-3.0)
- Backend: Python 3.14 con FastAPI, OpenCV (marcadores ArUco), SciPy (el
  emparejamiento) y YOLO26 de Ultralytics; su propia base de datos PostgreSQL 18,
  separada de la de DataIQ y la de SIMIQ3D. Cómo se corre y qué expone:
  [`backend/README.md`](backend/README.md)
- Autenticación: valida el JWT de DataIQ con su clave pública (JWKS). La
  cookie de sesión no llega al Servidor PC1 (otro dominio): el frontend pide a
  DataIQ un token corto (`POST /auth/module-token`, 5 minutos) y lo manda en
  `Authorization: Bearer` (pieza 10 de la
  [checklist del backend de DataIQ](../dataiq/docs/checklist-backend.md))
- Servidor PC1: el PC de escritorio de Mauricio, con la base de SIVRI en un
  contenedor local (decidido por Mauricio el 2026-11-18)
- Frontend: Angular, como el shell y DataIQ

## Licencia

SIVRI usa YOLO26 de Ultralytics, que se distribuye con licencia AGPL-3.0, y
Ultralytics sostiene que los modelos entrenados con su librería también quedan
bajo esa licencia. Por eso `sivri/` va con **AGPL-3.0**, y el resto del repo
sigue con MIT (decidido por Mauricio el 2026-10-13). SIVRI es un programa
aparte, que se comunica con DataIQ por HTTP: la AGPL no se extiende a DataIQ ni
al shell. SIVRI puede usar código MIT del repo; el código de SIVRI no puede ir
en las partes MIT.

Lo que obliga:

- Quien usa SIVRI por internet puede obtener su código fuente: la interfaz
  lleva un enlace «Código fuente» al repo.
- Los pesos del modelo entrenado se publican.
- El dataset de fotos es aparte: no deriva de Ultralytics y lleva su propia
  licencia en Kaggle.

## Cómo se usa

Para estudiantes que practican en el laboratorio. SIVRI valida mesas armadas, no
procedimientos ni tiempos quirúrgicos; la cámara mira siempre desde arriba.

1. El estudiante abre SIVRI y apunta la cámara a la mesa, con los cuatro
   marcadores a la vista.
2. **Mientras arma**, SIVRI solo nombra lo que ve: sobre cada instrumento, su
   etiqueta («Tijera de Mayo»). No valida nada todavía.
3. **Cuando la mesa está armada**, SIVRI la compara con las cinco técnicas y
   muestra la que más se parece, con su porcentaje («Mastectomía · 90 %»), y
   qué instrumentos están en su lugar y cuáles mover y dónde van (la forma de
   la frase, con lo que sale de DataIQ: «Pinza Kelly (n.º 2): va en el centro, a
   la derecha, junto a Pinza Rochester (n.º 3)»). Si las dos técnicas más
   parecidas quedan muy cerca, muestra las dos. El estudiante no elige la
   técnica: SIVRI la reconoce.

## Qué es una mesa correcta

Decidido por Mauricio el 2026-10-13:

- **Celda exacta.** Cada instrumento va en su celda del arreglo de DataIQ; si
  no, SIVRI dice dónde va. Es lo que dice el Formato 115 (la mesa de Mayo es
  «un ordenamiento espacial normalizado que el instrumentador debe reproducir
  con precisión»; se registra la posición, no la cantidad). La celda es la
  medida interna: al estudiante no se le habla de filas, columnas ni celdas
  (decidido por Mauricio el 2026-10-27), sino de la zona de la mesa, lo que
  tiene al lado y el número del diagrama de IQ. La frase la arma el backend,
  como SIMIQ3D (decidido por Mauricio el 2026-11-18).
- **Margen técnico.** Un instrumento que queda justo en el borde entre dos
  celdas no se marca como error: puede ser imprecisión de la medición, no del
  estudiante. El tamaño del margen se ajusta con las fotos de validación.
- **Marcadores en las esquinas.** Cuatro marcadores ArUco impresos, en las
  esquinas de la mesa, le dan a SIVRI la posición exacta de la mesa en cada
  cuadro, y con ella la cuadrícula (homografía, con OpenCV). SIVRI se usa en el
  laboratorio, donde ponerlos es fácil; con una guía de encuadre en pantalla,
  un encuadre torcido correría todo una celda y daría errores falsos.

El arreglo se toma del [catálogo de DataIQ](../dataiq/README.md#mesas-de-mayo-de-cirugía-general).

## Cómo se valida la mesa

Sigue el esquema de los sistemas que verifican bandejas de instrumental y la
disposición de productos en estanterías («planogram compliance»): detectar,
emparejar cada detección con su posición esperada y darle un estado a cada
objeto. Para cada una de las cinco técnicas, con su propia cuadrícula (filas y
columnas de DataIQ):

1. **Emparejar.** Cada instrumento detectado se empareja con una posición
   esperada del mismo instrumento, con el algoritmo húngaro (el emparejamiento
   que minimiza la distancia total). Así se resuelve qué detección corresponde
   a cuál cuando hay dos instrumentos iguales en la mesa.
2. **Medir.** De cada pareja, dónde cae el **centro** de la caja del
   instrumento respecto de sus celdas esperadas (un objeto puede ocupar varias
   celdas). Cuenta el centro y no la caja entera porque un instrumento suele
   ser más largo que una celda: bien puesto, sobresale hacia las vecinas
   (corregido por Mauricio el 2026-10-15; antes se medía qué parte de la caja
   caía dentro, y un instrumento bien puesto salía mal).
3. **Dar un estado a cada objeto:**

   | Estado | Cuándo | Qué ve el estudiante |
   |---|---|---|
   | En su lugar | El centro cae dentro de sus celdas, fuera del margen | Marcado como correcto |
   | Mover | El centro cae en otra celda, fuera del margen | Dónde va («va en el centro, a la derecha, junto a Pinza Rochester (n.º 3)») |
   | Dudoso | El centro cae en el margen técnico: la franja junto al borde de sus celdas | Nada: puede ser imprecisión de la medición |
   | Falta | Se esperaba y no aparece | Qué instrumento falta y dónde va |
   | Sobra | Aparece y no se esperaba | Qué instrumento sobra |

4. **Porcentaje de la técnica:** instrumentos en su lugar sobre instrumentos
   esperados. SIVRI muestra la técnica con el porcentaje más alto, o las dos
   más altas si quedan muy cerca.

El ancho del margen (punto de partida: el 10 % del lado de la celda, a cada
lado del borde) y la distancia que cuenta como «muy cerca» se ajustan con la
sesión de validación.

**Cómo se evalúa esta lógica**, además de las métricas del detector: con las
mesas armadas con errores a propósito, que tienen anotado cuál es el error.

- De los errores reales, cuántos detectó SIVRI (exhaustividad).
- De los errores que reportó SIVRI, cuántos eran reales (precisión).
- En cuántas mesas reconoció bien la técnica.

## Estructura

```
sivri/
├── LICENSE            AGPL-3.0
├── backend/           API, validación de la mesa y su base (README propio)
├── frontend/
└── docs/
    ├── dataset.md     de dónde salen las imágenes y qué instrumentos reconoce
    └── checklist.md   avance por actividad de DSRM
```

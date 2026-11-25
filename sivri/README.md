<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../design/brand/modules/sivri-dark.svg">
    <img src="../design/brand/modules/sivri.svg" alt="SIVRI" width="173">
  </picture>
</p>

La mesa armada, revisada por la cámara. El estudiante apunta la cámara del
celular a la mesa de Mayo que armó; SIVRI reconoce cada instrumento, identifica
la técnica y le dice qué está en su lugar, qué debe mover y a dónde, qué falta y
qué sobra, según el arreglo publicado en DataIQ. Valida por técnica, no por
tiempo quirúrgico.

## Qué hace

- **Reconoce el instrumental** en tiempo real con un detector YOLO26, sobre 2 o
  3 cuadros por segundo del video del celular. Las imágenes se procesan y no se
  guardan.
- **Ubica la mesa** con cuatro marcadores ArUco en sus esquinas.
- **Valida la mesa de Mayo** de las cinco técnicas de Cirugía General: qué
  técnica es, su porcentaje y el estado de cada pieza (en su lugar, mover,
  falta o sobra), dicho por zona de la mesa, vecinos y número del diagrama.
- **En el computador** solo explica y lleva al celular con un código QR.

## Partes

| Carpeta | Qué es |
|---|---|
| [`backend/`](backend/README.md) | La API (FastAPI): detector, marcadores y validación de la mesa |
| [`frontend/`](frontend/README.md) | La app (Angular): la cámara del celular y la página del computador |
| [`servidor-pc1/`](servidor-pc1/README.md) | El servidor donde corre el backend, con sus servicios |
| [`docs/`](docs/) | Decisiones, validación, dataset, diagnósticos, frontend y checklists |

## Documentación

- Alcance del MVP, metodología y stack: [`docs/decisiones.md`](docs/decisiones.md).
- Qué es una mesa correcta y cómo se valida: [`docs/validacion.md`](docs/validacion.md).
- Dataset y protocolo de fotos: [`docs/dataset.md`](docs/dataset.md).
- Mediciones y diagnósticos: [`docs/diagnosticos.md`](docs/diagnosticos.md).
- El frontend por dentro: [`docs/frontend.md`](docs/frontend.md).
- Avance: [`docs/checklist.md`](docs/checklist.md) (por actividad de DSRM) y
  [`docs/checklist-frontend.md`](docs/checklist-frontend.md).

## Licencia

[AGPL-3.0](LICENSE), porque SIVRI usa YOLO26 de Ultralytics, y Ultralytics
sostiene que los modelos entrenados con su librería quedan bajo esa licencia. El
resto del repositorio es MIT: SIVRI es un programa aparte que se comunica con
DataIQ por HTTP, así que la AGPL no se extiende a DataIQ ni al shell. SIVRI
puede usar código MIT del repositorio, pero su código no puede ir en las partes
MIT.

Lo que obliga:

- Quien usa SIVRI por internet puede obtener su código fuente: la interfaz lleva
  un enlace «Código fuente» al repositorio.
- Los pesos del modelo entrenado se publican.
- El dataset de fotos es aparte: no deriva de Ultralytics y lleva su propia
  licencia.

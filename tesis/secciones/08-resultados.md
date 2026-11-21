# Resultados de la implementación del desarrollo tecnológico

## Qué lleva

- **DataIQ:** el dataset cargado (tabla de contenido), la API y la
  verificación con las pruebas automatizadas.
- **SIMIQ3D:** el visor con las cinco mesas de Mayo y la exactitud del chat
  sobre el banco de preguntas (respuestas correctas, respuestas inventadas,
  proporción entre el modelo y las plantillas) y el tiempo de respuesta.
- **SIVRI:** el detector (precisión, exhaustividad, mAP@0.5 y mAP@0.5:0.95,
  matriz de confusión y curvas de pérdida) y la lógica de validación sobre las
  mesas con errores puestos a propósito.
- **Evaluación con usuarios:** la SUS (meta de 68 o más) y el cuestionario
  tipo Likert de la prueba piloto.
- Capturas de cada producto.

## Fuentes en el repositorio

- Detector: [`sivri/docs/dataset.md`](../../sivri/docs/dataset.md),
  «Resultados del detector».
- Chat: [`simiq3d/backend/README.md`](../../simiq3d/backend/README.md) y los
  CSV del banco en [`../evidencias/`](../evidencias/).
- Las figuras: [`../figuras/`](../figuras/).

## Texto

### DataIQ

DataIQ está en producción con el catálogo de técnicas, el instrumental y las
mesas. Las mesas de Mayo de las cinco técnicas de Cirugía General están
publicadas con la posición medida de cada instrumento en las fotos del
programa de IQ: 57 colocaciones, en la versión publicada el 2026-11-21.

### SIMIQ3D

SIMIQ3D está en producción con el visor 3D y el chat. Los 16 instrumentos de
las cinco mesas se modelaron sobre las fotos (Fig. del catálogo de 16 modelos)
y cada mesa se arma con las posiciones medidas (Fig. de las posiciones
medidas en Tiroidectomía y Fig. de las cinco mesas). La captura de producción
muestra la mesa de Tiroidectomía con su leyenda, en la que cada instrumento se
elige por separado (Fig. de producción).

**Exactitud del chat.** El 2026-11-21 el banco de 153 preguntas se corrió
contra el catálogo de producción de DataIQ, con el mismo modelo que usa
SIMIQ3D (Qwen3-VL 8B en Ollama), en el PC de desarrollo. Antes se
actualizaron 8 preguntas cuya respuesta esperada correspondía a las mesas
anteriores a las listas de IQ del 2026-11-19 (por ejemplo, instrumentos que ya
no van en ninguna mesa). Resultado: **140 de 153 respuestas correctas
(91,5 %)**. Ninguna respuesta tuvo frases sin respaldo en los datos de DataIQ
según la verificación automática, que compara nombres, números y ubicaciones
(no el sentido de cada frase). La revisión del tutor corrigió 60 frases en 36
respuestas antes de mostrarlas. El modelo no responde igual en cada corrida:
entre dos corridas seguidas, el resultado varió en unas tres preguntas.

Las 13 respuestas incorrectas se agrupan así: tres respuestas fuera de tema
que el modelo contesta en lugar de declinar (incluido un intento de hacerle
olvidar sus reglas); tres comparaciones entre mesas que nombran un
instrumento de más o de menos; tres preguntas por datos clínicos en las que
falta un dato o la aclaración de que DataIQ no tiene tiempos quirúrgicos; y
casos aislados (una pregunta ambigua sin pedir precisión, un error de
escritura, una explicación general y una pregunta sobre cómo ordenar la mesa).
El tiempo por pregunta en el PC de desarrollo tuvo una mediana de 9,0 s y un
máximo de 30 s; el tiempo en producción, con el Servidor PC2, se mide aparte.
El detalle de cada pregunta está en
[`../evidencias/banco-simiq3d-2026-11-21.csv`](../evidencias/banco-simiq3d-2026-11-21.csv).

### SIVRI

El backend de SIVRI valida la mesa con el detector y los marcadores ArUco. El
dataset propio tiene 125 fotos y 1374 cajas en 15 clases. La primera corrida
del detector (`sivri-r1`, 2026-11-19) obtuvo en la Ronda 3, de prueba, una
precisión de 0,861, una exhaustividad de 0,843, un mAP@0.5 de 0,889 y un
mAP@0.5:0.95 de 0,628 (`sivri/docs/dataset.md`). Esas cifras corresponden a
las etiquetas anteriores a la corrección del 2026-11-21 (mangos intercambiados
y cajas cortas); las del entrenamiento con las etiquetas corregidas las
reemplazan.

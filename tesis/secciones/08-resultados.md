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
El detalle de cada pregunta está en
[`../evidencias/banco-simiq3d-2026-11-21.csv`](../evidencias/banco-simiq3d-2026-11-21.csv).

**Tiempo de respuesta en producción.** El 2026-11-21 se hicieron 20 preguntas
al chat de producción, con el modelo en el Servidor PC2: cuatro por técnica
(mostrar la mesa, ubicar un instrumento, para qué sirve un instrumento y las
indicaciones de la técnica). La respuesta llega por partes, y se midieron tres
momentos:

| Momento | Mediana | Percentil 90 | Mínimo | Máximo |
|---|---|---|---|---|
| La orden de la escena (qué técnica abre y qué resalta) | 0,19 s | 0,22 s | 0,18 s | 1,01 s |
| El primer texto de la respuesta | 4,3 s | 5,4 s | 2,9 s | 7,1 s |
| La respuesta completa | 10,4 s | 19,6 s | 6,1 s | 21,3 s |

La escena cambia casi de inmediato porque la decide el código con los datos
de DataIQ, sin esperar al modelo de lenguaje; el máximo de 1,01 s fue la
primera petición, que arranca el servicio. El texto empieza a aparecer a los
pocos segundos y se completa mientras se lee; las respuestas más largas son
las que presentan una mesa completa (entre 18 y 21 s). La medición llega hasta
la orden de la escena; dibujarla en el navegador suma la descarga de los
modelos 3D la primera vez. El detalle está en
[`../evidencias/tiempos-simiq3d-2026-11-21.csv`](../evidencias/tiempos-simiq3d-2026-11-21.csv).

**Recorrido de las cinco mesas en producción.** El 2026-11-21 se pidió por
chat, con la cuenta de prueba y una conversación nueva por técnica, la mesa
de Mayo de cada una de las cinco técnicas de Cirugía General («Muéstrame la
mesa de Mayo de la …»). En las cinco, el visor abrió la mesa pedida y la
leyenda coincidió objeto por objeto, en número y nombre, con la mesa publicada
en DataIQ: 10 objetos en Colecistectomía y Mastectomía, 12 en Eventrorrafia y
Hemicolectomía derecha y 13 en Tiroidectomía. En el texto de las respuestas se
observaron dos fallas de forma y una de contenido: en Colecistectomía y
Eventrorrafia el modelo abrió una negrita sin cerrarla y la interfaz la
muestra como asteriscos, y en Hemicolectomía derecha nombró como «pinza de
Babcock (n.º 3)» al vecino de la pinza de Allis, que es la pinza Rochester. El
detalle está en
[`../evidencias/recorrido-simiq3d-2026-11-21.csv`](../evidencias/recorrido-simiq3d-2026-11-21.csv),
y la captura de Mastectomía en `figuras/simiq3d-chat-mastectomia.png`.

### SIVRI

**Detección.** En el dataset corregido de 125 fotos y 1487 cajas, YOLO26n
se entrenó durante 120 épocas en CPU sobre las 55 fotos de Ronda 1. Los
pesos elegidos con las 35 fotos de Ronda 2 se evaluaron una vez sobre las
35 fotos de Ronda 3. En esta última ronda la precisión fue 0,794, la
exhaustividad 0,862, el mAP@0.5 0,887 y el mAP@0.5:0.95 0,614. Las
disecciones con y sin garra obtuvieron AP@0.5 de 0,956 y 0,931. Las tres
rondas se capturaron el mismo día. [Curvas del entrenamiento](../figuras/sivri-r2-curves.png) · [Matriz de confusión de validación](../figuras/sivri-r2-confusion.png).

**Reconocimiento y ubicación.** Con los pesos de `sivri-r2` y las cinco
mesas del Excel local de DataIQ se hallaron los cuatro marcadores en 33
de las 35 fotos de Ronda 3. La técnica indicada por la captura quedó
primera en 24 de esas 33 (72,7 %) y entre las mostradas en 26 (78,8 %).
Las fotos son tomas repetidas de los montajes. Al fijar la técnica del
archivo, 10 de 13 fotos evaluables rotuladas «Bien Armada» recibieron
algún aviso. Hubo 20 indicaciones de ausencia y 9 de movimiento.
Al sustituir YOLO por las cajas anotadas quedaron 10 de movimiento en
cinco fotos. Esto identifica tanto omisiones del detector como desacuerdos
entre centros y celdas. Las fotos bien armadas de Ronda 3 también sirvieron
de referencia para definir la cuadrícula. [Resultados por ronda y situación](../evidencias/sivri-spatial-2026-11-22.csv).

En IMG_1925 (Mastectomía, Error A) ambos recorridos ubicaron al Farabeuf
fuera de su zona. Con las cajas anotadas se indicó mover la Kelly. Con
YOLO se reportó ausente. Las variantes A/B carecen de un registro
independiente de los errores introducidos. La medición espacial es un
diagnóstico técnico. La exactitud frente al criterio docente, la latencia
desde un celular y la usabilidad con estudiantes quedan por medir.
[Ejemplo de Mastectomía](../figuras/sivri-spatial-example.png).

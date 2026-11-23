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

El catálogo se consulta sin cuenta, por especialidad, y cada técnica muestra
sus datos clínicos con la fuente (Fig. del catálogo y Fig. de la ficha de
Tiroidectomía); con una cuenta se ven además el instrumental y las mesas, con
el diagrama numerado de la mesa de Mayo (Fig. de la mesa de Mayo de
Tiroidectomía).

**Pruebas automatizadas.** El texto del segundo corte reportaba 69 pruebas del
backend de DataIQ. Contadas de nuevo el 2026-11-22, cada parte del sistema
tiene sus propias pruebas, que la integración continua ejecuta en los PR que
tocan ese módulo; las de los backends corren contra una base PostgreSQL de
prueba:

| Parte | Pruebas | Qué cubren |
|---|---:|---|
| Backend de DataIQ | 129 | 26 de las reglas del dominio, 16 de los adaptadores, 72 de la API y 15 de la carga del catálogo |
| Backend de SIMIQ3D | 280 | 140 del dominio (el chat, la revisión de frases), 104 de los adaptadores y 36 de la API |
| Backend de SIVRI | 96 | 34 del dominio (la validación de la mesa), 32 de los adaptadores y 30 de la API |
| Frontend de DataIQ y shell | 2309 | Componentes, servicios y rutas |
| Frontend de SIMIQ3D | 130 | Componentes, el visor y el chat |

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

**Reconocimiento y ubicación.** En las rondas 2 y 3, 64 de 70 fotos tenían
los cuatro marcadores necesarios para evaluar la mesa. El 2026-11-22, la
técnica registrada quedó primera con YOLO en 50 de esas 64 fotos. El
2026-11-23, al incorporar los instrumentos sobrantes al cálculo del parecido
y recalcular las celdas de las cinco mesas, quedó primera en 60 de 64
(30 de 31 en Ronda 2 y 30 de 33 en Ronda 3). Las fotos en que se mostraron
dos técnicas pasaron de 8 a 6. Con las cajas anotadas, la técnica correcta
quedó primera en 60 de 64 fotos el primer día y en las 64 el segundo.
Al fijar la técnica registrada en las 26 fotos evaluables «Bien armada»,
los avisos de movimiento con YOLO bajaron de 24 a 6. En ambas fechas hubo
45 avisos de faltante, ninguno de sobrante y 23 fotos con algún aviso.
Con las cajas anotadas, los avisos de movimiento bajaron de 38 a 7, todos
los restantes en Ronda 2. Las fotos son tomas repetidas de los montajes y las
«Bien armada» de las tres rondas se usaron para recalcular las celdas. La
comparación espacial mide la concordancia con esas referencias.
[Diagnóstico por ronda](../../sivri/backend/README.md#diagnóstico-local-con-las-celdas-recalculadas-2026-11-23);
el detalle por ronda y técnica está en
[`../evidencias/sivri-reconocimiento-2026-11-23.csv`](../evidencias/sivri-reconocimiento-2026-11-23.csv)
y [`../evidencias/sivri-avisos-bien-armada-2026-11-23.csv`](../evidencias/sivri-avisos-bien-armada-2026-11-23.csv).

Casi la mitad de esos faltantes eran pinzas de disección que el modelo sí veía,
pero con confianza menor que el umbral de 0,35. Con un umbral propio para los
instrumentos que el modelo ve con poca confianza, elegido en la Ronda 2, los
faltantes de la Ronda 3, medida una sola vez, bajaron de 20 a 15 y las fotos
«Bien armada» con algún aviso, de 10 a 8 de 13, sin detecciones falsas nuevas;
los faltantes de las pinzas de disección pasaron de 21 a 2 en las dos rondas
(2026-11-23,
[umbral por instrumento](../../sivri/backend/README.md#umbral-de-confianza-por-instrumento-2026-11-23)).

En el diagnóstico del 2026-11-22, en IMG_1925 (Mastectomía, Error A) ambos recorridos ubicaron al Farabeuf
fuera de su zona. Con las cajas anotadas se indicó mover la Kelly. Con
YOLO se reportó ausente. Las variantes A/B carecen de un registro
independiente de los errores introducidos. La medición espacial es un
diagnóstico técnico. La exactitud frente al criterio docente, la latencia
desde un celular y la usabilidad con estudiantes quedan por medir.
[Ejemplo de Mastectomía](../figuras/sivri-spatial-example.png).

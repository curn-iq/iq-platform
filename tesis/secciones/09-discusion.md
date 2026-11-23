# Discusión

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

- Una triangulación (criterio 10) entre tres elementos, sin repetir los
  resultados: los hallazgos empíricos (DataIQ, precisión del detector, chat,
  SUS); los antecedentes del marco teórico, comparando con otros estudios de
  visión artificial aplicada a la salud; y el impacto en el aprendizaje
  autónomo en la CURN.
- Qué explica cada resultado y qué no alcanzó a cubrir el MVP.

## Fuentes en el repositorio

- [`08-resultados.md`](08-resultados.md) y
  [`05-marco-de-referencia.md`](05-marco-de-referencia.md).
-->

La discusión contrasta, objetivo por objetivo, los resultados con los
antecedentes del marco teórico y con fuentes nuevas, y su efecto en el
aprendizaje autónomo en la CURN.

**Diagnóstico y alcance (objetivos 1 y 2).** El diagnóstico, con tres
reuniones con tres estudiantes del programa y su docente tutora, es coherente con la
brecha que describen Arias et al. para la formación sin laboratorio [21], que
trata de la virtualización de la formación y no de la práctica fuera del
laboratorio en general: los estudiantes dijeron no tener cómo verificar solos
la distribución del instrumental. Es una percepción recogida en reuniones de
trabajo con quienes documentaron las técnicas, no una medición del problema
en el conjunto de los estudiantes del programa; la prueba piloto es la que
puede contrastarla con una muestra mayor.
Escobar-Castillejos et al. señalan la falta de repositorios adaptados al
contexto local como la principal barrera para llevar estos sistemas a un
programa concreto [9]. DataIQ responde a esa barrera con un dataset propio del
programa, y el proceso mostró por qué hace falta: los documentos de las
técnicas no bastaron para las mesas de Mayo, que solo quedaron verificables
cuando se fotografiaron las mesas reales y el programa entregó sus listas. La
regla de marcar como «propuesto» lo que la fuente no trae permitió avanzar sin
inventar datos clínicos. Aun así, de los 478 objetos de las mesas, 153 (32 %)
siguen propuestos y 325 (68 %) vienen de los documentos o de las fotos del
programa, y ninguno de los dos grupos está validado por un docente; es el
indicador institucional de la justificación.

**Diseño (objetivo 3).** La separación de los módulos, con DataIQ como única
fuente por su API, se puso a prueba en el tercer corte: SIMIQ3D y SIVRI se
construyeron sin acceder a la base de DataIQ, y al recalcular las celdas de las
mesas bastó con publicar una versión nueva en DataIQ para que ambos la usaran.
El ciclo de construir, evaluar y corregir de la ciencia del diseño [3], [47],
con la evaluación formativa de FEDS [50], se vio en cada módulo: las pruebas
con los datos reales cambiaron el diseño del chat dos veces y la forma de
asignar las celdas de SIVRI.

**Desarrollo (objetivo 4).** Gutiérrez-Sánchez et al. mostraron la viabilidad
de un visor tridimensional web en equipos de consumo [14], y Chheang et al.,
el valor de un asistente conversacional en la enseñanza de la anatomía [28].
SIMIQ3D combina ambas ideas con dos decisiones propias. La primera, construir
los modelos sobre fotos del laboratorio y no sobre catálogos, respondió a la
observación del programa de que el instrumental no era del todo correcto. La
segunda, que el modelo de lenguaje redacte solo con los datos de DataIQ,
sigue la misma lógica que Xiong et al. comprobaron en preguntas médicas: anclar
la respuesta a documentos recuperados mejora la exactitud de los modelos de
lenguaje [32]. En SIVRI, la geometría de la mesa no depende del detector: los
marcadores ArUco [36] dan la cuadrícula aunque el instrumental tape parte de la
mesa, y la revisión de las cajas con SAM 2 [38] permitió corregir el dataset
con un criterio medible en lugar de trazar a ojo.

**Evaluación técnica (objetivo 5).** El detector alcanzó un mAP@0.5 de 0,887
con 125 fotos y 16 clases. Poomrittigul et al., con 1000 imágenes de 14
instrumentos odontológicos sobre bandejas, reportan un mAP@0.5 de 95,9 % con
YOLOv8, y usan la división por sesión de captura como evaluación principal
para limitar la fuga de datos entre entrenamiento y prueba [51]. El dataset de
SIVRI se dividió por ronda, pero las tres rondas son de una misma visita y del
mismo instrumental, así que no es una división por sesión y sus métricas pueden
ser más optimistas. Con un dataset ocho veces menor, SIVRI queda por debajo
(0,887 frente a 0,959), aunque la comparación es solo de orden de magnitud: los
instrumentos, las imágenes y las condiciones son otros.

Los errores del
detector se concentran en instrumentos parecidos entre sí (la Kocher y la Kelly
Adson se confunden con la Rochester, y los dos mangos entre sí), y Ran et al.
[4] reportan la oclusión parcial como la dificultad de su dominio. Que
reetiquetar la Kelly no mejorara el modelo sugiere que el límite está en la
cantidad y variedad de las fotos, pero este trabajo no lo comprobó con más
fotos; los conjuntos de miles de imágenes de Ran et al. [4] y Deol et al. [26]
son una referencia, no una prueba.

En velocidad, Frey et al. reportan 1,12 ms
por fotograma [12] (su artículo no precisa el equipo en lo consultado); en el
proyecto se midió una mediana de 24 ms por cuadro, en CPU y sin tarjeta
gráfica, con el YOLO26n preentrenado y no con los pesos de SIVRI (2026-11-18,
`sivri/docs/checklist.md`), y un ensayo de ida y vuelta por Tailscale Funnel
con una sola foto dio 248 ms (`sivri/backend/README.md`). Esas cifras permiten
validar de dos a tres cuadros por segundo, pero no se compararon con otra
versión de YOLO, así que no demuestran que YOLO26 sea la mejor elección; solo
que su tamaño nano corre en CPU a esa velocidad [2].

El chat respondió bien el
91,5 % del banco de preguntas. Ese banco es del equipo y también guió el
desarrollo (la exactitud pasó de 79,5 % a 100 % sobre el banco de desarrollo el
2026-10-30), y para esta medición se actualizaron 8 respuestas esperadas, así
que es una medida del estado actual del chat y no una prueba con preguntas
nuevas. La verificación automática compara nombres, números y ubicaciones, no
el sentido de cada frase, y ya había corregido 60 frases en 36 respuestas, de
modo que «ninguna frase sin respaldo» describe lo que se muestra y no lo que el
modelo redacta. De las 13 respuestas incorrectas, solo tres fueron preguntas
fuera de tema que el chat contestó en lugar de declinar; el resto fueron
comparaciones entre mesas, datos clínicos incompletos y casos aislados.

**La referencia de «mesa bien armada».** El marco asume una disposición
normalizada que el estudiante debe reproducir. Las fotos mostraron otra cosa:
el programa de IQ no armó la mesa igual en cada ronda (por ejemplo, invirtió
el orden de los dos mangos de bisturí), y las celdas de SIVRI tuvieron que
recalcularse con las tres rondas para reducir las indicaciones de mover,
contadas con las cajas anotadas, de 49 a 18. Esto sugiere que la «mesa correcta» tiene una tolerancia que un docente
debe fijar, y que un detector de posiciones sin ella marcaría como error lo que
el programa acepta. El 91,5 % del chat tampoco se compara con otro estudio: el
referente de anclaje [32] mide preguntas médicas de otro tipo, así que este
trabajo no tiene un valor de referencia para ese resultado.

**La retroalimentación automática.** El proyecto parte de que la
retroalimentación inmediata puede trasladarse a un sistema automatizado, como
lo mostraron Mirchi et al. [7] y Yilmaz et al. [8], y como asocia una revisión
sistemática reciente con mejoras de moderadas a grandes en el desempeño
técnico, sobre todo en tareas básicas y repetitivas [20]. SIVRI la ofrece, pero
en las mesas bien armadas todavía aparecen avisos que no corresponden, sobre
todo faltantes del detector, y la exactitud de sus indicaciones frente al
criterio de un docente no se midió. Como la forma de la retroalimentación
incide en el aprendizaje [6], un aviso falso puede minar la confianza del
estudiante: en su estado actual, SIVRI complementa la supervisión docente y no
la reemplaza. Además, los estudios de [20] miden habilidades técnicas y no la
distribución del instrumental, de modo que su efecto en este dominio sigue
siendo una suposición.

**Prueba piloto e impacto en la CURN (objetivo 6).** El ecosistema crea las
condiciones para cerrar la brecha descrita: SIMIQ3D permite estudiar la mesa de
cada técnica fuera del laboratorio y SIVRI permite practicar su armado sin un
docente al lado. Pero el efecto en el aprendizaje no se midió: el objetivo 6
entrega el diseño de la prueba piloto, con la escala de usabilidad, y su
aplicación es posterior a esta entrega. Estos
resultados demuestran la viabilidad técnica del ecosistema, no su efecto
pedagógico. En términos del aprendizaje autorregulado [29], el ecosistema
ofrece una referencia para planificar (SIMIQ3D) y para controlar y evaluar
(SIVRI), pero si el estudiante se autorregula mejor con ellos es justamente lo
que la prueba piloto debe valorar. Los antecedentes colombianos con estudiantes
de Instrumentación Quirúrgica [23], [24] evaluaron competencias o destrezas
psicomotoras, no la distribución de la mesa, así que este trabajo no puede
compararse con ellos en resultados, solo en el contexto. Tampoco se incorporaron el puntaje y el registro del progreso que
la evidencia sobre gamificación asocia con una mejor retención del
reconocimiento del instrumental [27].

**Lo que no alcanzó a cubrir el MVP.** El alcance se limitó a la mesa de Mayo
de cinco técnicas de Cirugía General, con un solo juego de instrumental
fotografiado en una sola visita al laboratorio, y SIVRI depende de un
computador del equipo (el Servidor PC1) para reconocer el instrumental. En
SIMIQ3D la mesa del visor tiene un tamaño provisional, el mismo para las cinco
técnicas, y el chat no ordena ni agrupa el instrumental por tiempos
quirúrgicos, porque DataIQ no los registra. Las otras trece técnicas tienen su
catálogo y sus mesas en DataIQ, pero no su visor ni su detector. Estas
limitaciones no invalidan los resultados técnicos, pero acotan su alcance a
lo que el MVP probó, y orientan las recomendaciones.

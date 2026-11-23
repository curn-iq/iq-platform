# Resumen y Abstract

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

- Resumen estructurado de 400 a 500 palabras, en español (criterio 2 de la
  rúbrica del Formato 40), con cinco partes rotuladas: contexto, objetivo,
  método, resultados y conclusiones y límites.
- El mismo resumen en inglés (Abstract), también de 400 a 500 palabras.
- Palabras clave y *Keywords*.
- Se redacta al final, con los resultados reales del corte.

## Fuentes en el repositorio

- Los resultados: [`08-resultados.md`](08-resultados.md).
- Los objetivos: [`04-objetivos.md`](04-objetivos.md).
-->

## Título

Ecosistema tecnológico basado en inteligencia artificial para el aprendizaje
autónomo de la distribución del instrumental quirúrgico en las mesas de Mayo y
de reserva

## Resumen

**Contexto.** En el programa de Instrumentación Quirúrgica de la Corporación
Universitaria Rafael Núñez (CURN), la distribución del instrumental en la mesa
se aprende en el laboratorio de simulación, con la supervisión directa del
docente; fuera de ese espacio, el estudiante no tiene una forma objetiva de
verificar su práctica.

**Objetivo.** Desarrollar un ecosistema tecnológico basado en inteligencia
artificial para el aprendizaje autónomo de la distribución de instrumental
quirúrgico.

**Método.** Investigación aplicada de desarrollo tecnológico, con enfoque
mixto, que siguió la metodología de investigación en ciencia del diseño (DSRM)
y la evaluación formativa y sumativa del marco FEDS en tres cortes académicos.
Los datos se obtuvieron de reuniones de trabajo con el programa, de la revisión
de sus documentos de técnicas y de una sesión de fotos de las mesas de Mayo en
el laboratorio. Cada módulo se evaluó con su propio instrumento: pruebas
automatizadas, un conjunto de fotos de prueba y un banco de preguntas.

**Resultados.** El ecosistema tiene tres módulos. DataIQ es la fuente única del
catálogo: dieciocho técnicas de cinco especialidades, con las mesas de Mayo de
cinco técnicas de Cirugía General rehechas con las listas y las fotos del
programa y la posición medida de cada instrumento. SIMIQ3D muestra esas mesas
en un visor tridimensional, con dieciséis modelos construidos sobre las fotos,
y un chat en el que un modelo de lenguaje responde con los datos de DataIQ;
respondió bien 140 de 153 preguntas de un banco de evaluación (91,5 %), sin
frases sin respaldo después de su revisión automática, y en producción mostró
la escena en 0,19 s y el primer texto en 4,3 s (medianas). SIVRI valida con la
cámara del celular una mesa armada: un detector YOLO26n entrenado con un
dataset propio de 125 fotos y dieciséis clases obtuvo, en las fotos de prueba,
un mAP@0.5 de 0,887 y un mAP@0.5:0.95 de 0,614, y reconoció la técnica correcta
en primer lugar en 60 de 64 fotos de validación y prueba, aunque esas fotos
también sirvieron de referencia para ubicar las piezas y no son una medición
independiente. Todavía da avisos que no corresponden en mesas bien armadas,
sobre todo por instrumentos parecidos entre sí. El trabajo documenta también
las dificultades de modelar el instrumental a partir de fotos reales y de
etiquetar piezas apiladas, y cómo se resolvió cada una.

**Conclusiones.** El ecosistema demuestra la viabilidad técnica de acompañar
la práctica autónoma con visualización tridimensional y retroalimentación
automática. La escala de usabilidad y la prueba piloto se aplican con el
programa después de esta entrega, por lo que el efecto sobre el aprendizaje
queda por medir; los límites actuales son el tamaño del dataset, una sola
sesión de fotos y la confusión entre instrumentos parecidos.

**Palabras clave:** instrumentación quirúrgica, mesa de Mayo, visión por
computador, YOLO, visualización tridimensional, modelo de lenguaje,
aprendizaje autónomo.

## Abstract

**Context.** In the Surgical Instrumentation program of the Corporación
Universitaria Rafael Núñez (CURN), students learn how instruments are laid out
on the table in the simulation laboratory, under direct supervision; outside
that space they have no objective way to check their practice.

**Objective.** To develop an artificial-intelligence-based technological
ecosystem for the autonomous learning of surgical instrument layout.

**Method.** Applied technological development research with a mixed approach,
following Design Science Research Methodology (DSRM) and the formative and
summative evaluation of the FEDS framework over three academic terms. Data came
from working meetings with the program, a review of its surgical technique
documents and a photographic session of the Mayo tables in the laboratory. Each module was evaluated with its own instrument:
automated tests, a set of test photographs and a question bank, and the
decisions taken at each step were recorded with their author and date.

**Results.** The ecosystem has three modules. DataIQ is the single source of
the catalog: eighteen techniques from five specialties, with the Mayo tables
of five General Surgery techniques rebuilt from the program's lists and
photographs and the measured position of each instrument. SIMIQ3D shows those
tables in a three-dimensional viewer, with sixteen models built from the
photographs, and a chat in which a language model answers with DataIQ data; it
answered 140 of 153 questions of an evaluation bank correctly (91.5%), with no
unsupported sentences after its automatic review, and in production it showed
the scene in 0.19 s and the first text in 4.3 s (medians). SIVRI validates an
assembled table with a phone camera: a YOLO26n detector trained on a dataset of
125 own photographs and sixteen classes reached, on the test photographs, an
mAP@0.5 of 0.887 and an mAP@0.5:0.95 of 0.614, and ranked the correct technique
first in 60 of 64 validation and test photographs, although those photographs
also served as reference for placing the instruments and are not an
independent measurement. It still raises warnings on correctly assembled
tables, mostly because of similar instruments. The work also documents the
difficulties of modelling the instruments from real photographs and of
labeling stacked pieces, and how each one was resolved during the project.

**Conclusions.** The ecosystem shows the technical feasibility of supporting
autonomous practice with three-dimensional visualization and automatic
feedback. The usability scale and the pilot test are applied with the program
after this submission, so the effect on learning remains to be measured; the
current limits are the size of the dataset, a single photographic session and
the confusion between similar instruments.

**Keywords:** surgical instrumentation, Mayo table, computer vision, YOLO,
three-dimensional visualization, language model, autonomous learning.

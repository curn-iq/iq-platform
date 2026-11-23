# Metodología

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

- Tipo de investigación y enfoque.
- Alcance y diseño.
- Método: las actividades de la metodología DSRM en el proyecto (tabla).
- Población y muestra (criterio 7): el universo, la población objetivo
  (número de estudiantes y docentes del programa de Instrumentación Quirúrgica
  de la CURN) y el tamaño y tipo de muestra de la prueba piloto (cuestionario
  Likert) y de la Escala de Usabilidad del Sistema (SUS).
- Desarrollo metodológico por objetivo específico (tabla).
- Análisis de datos: las métricas de cada objetivo (detector de SIVRI, lógica
  de validación de SIVRI, exactitud del chat de SIMIQ3D, SUS, cuestionario de
  pertinencia).
- Consideraciones éticas: consentimiento informado y tratamiento de datos.
- Uso de inteligencia artificial.
- Limitaciones y riesgos.

## Fuentes en el repositorio

- Evaluación del MVP como fase preliminar: [`README.md`](../../README.md),
  «Descripción».
- Exactitud del chat: [`simiq3d/backend/README.md`](../../simiq3d/backend/README.md),
  «Banco de preguntas».
- Dataset y detector: [`sivri/docs/dataset.md`](../../sivri/docs/dataset.md).
- Datos personales: [`docs/privacidad.md`](../../docs/privacidad.md).
- Lo que queda para después del MVP:
  [`docs/despues-del-mvp.md`](../../docs/despues-del-mvp.md).
-->

## Tipo de investigación, paradigma y enfoque

El trabajo se inscribe en el paradigma de la ciencia del diseño, en el que el
conocimiento se produce al construir un artefacto que resuelve un problema
real y al evaluar su desempeño en ese contexto [47].

El proyecto es una investigación aplicada en la modalidad de desarrollo tecnológico. Según la tipología adoptada por Minciencias a partir del Manual de Frascati, la investigación aplicada "consiste también en trabajos originales realizados para adquirir nuevos conocimientos; sin embargo, está dirigida fundamentalmente hacia un objetivo práctico específico" [48]; el desarrollo tecnológico, por su parte, materializa ese conocimiento en un producto o sistema funcional. Ambas condiciones se cumplen en este trabajo: su objetivo práctico es apoyar el aprendizaje autónomo de la distribución del instrumental quirúrgico, y su producto es un ecosistema de software. El enfoque es mixto [49]. El componente cualitativo se empleó en el diagnóstico y en la especificación del alcance, porque en esas fases interesaba comprender las prácticas y los criterios del programa de Instrumentación Quirúrgica a partir de su docente, sus estudiantes y su documentación. El componente cuantitativo se empleará en la evaluación, porque la precisión del modelo de detección, la usabilidad del sistema y su valoración pedagógica son variables medibles que pueden compararse con valores de referencia.

## Alcance y diseño

El alcance es descriptivo: la investigación busca caracterizar el desempeño y la aceptación del sistema desarrollado, no establecer relaciones causales entre variables [49]. El diseño es no experimental, porque la evaluación no manipula condiciones ni conforma grupos de control.

## Método

Se adoptó la metodología de investigación en ciencia del diseño (Design
Science Research Methodology, DSRM) de Peffers et al. [3], concebida para
investigaciones cuyo producto es un artefacto tecnológico y cuya validez
depende de su evaluación en el contexto del problema. Comprende seis
actividades: identificación del problema y motivación, definición de los
objetivos de la solución, diseño y desarrollo, demostración, evaluación y
comunicación. La Tabla IV relaciona cada actividad con los objetivos
específicos y con el corte en que se desarrolló. La evaluación sigue el marco
FEDS de Venable et al. [50], que distingue la evaluación formativa, realizada
durante el desarrollo para corregir el artefacto, de la sumativa, realizada al
final para valorar el resultado. La evaluación formativa se apoyó en las
pruebas automatizadas del software, en la validación automática del dataset
antes de su carga y en el banco de preguntas del chat; la evaluación sumativa
se realizó en el tercer corte con las métricas del detector y con la exactitud
y el tiempo de respuesta del chat, y la escala de usabilidad y la prueba piloto
se aplican cuando el programa presente la plataforma a sus estudiantes y
docentes.

**TABLA IV. Actividades de la metodología DSRM en el proyecto**

| Actividad DSRM | Objetivo específico | Desarrollo en el proyecto | Corte |
|---|---|---|---|
| Identificación del problema y motivación | 1 | Reuniones de trabajo con el programa de Instrumentación Quirúrgica | Primero |
| Definición de los objetivos de la solución | 2 | Revisión de la documentación de técnicas quirúrgicas y planificación de los módulos; listas y fotos de las mesas de Mayo de Cirugía General | Primero y tercero |
| Diseño y desarrollo | 3 y 4 | Arquitectura y modelo de datos; DataIQ (backend en el segundo corte, frontend en el tercero), SIMIQ3D y SIVRI | Primero, segundo y tercero |
| Demostración | 4 | Las cinco mesas de Mayo en producción: exploración por chat en SIMIQ3D y validación de mesas desde el celular con SIVRI | Tercero |
| Evaluación | 5 y 6 | Métricas del detector, exactitud y tiempo de respuesta del chat, y diseño de la prueba piloto (tercer corte); aplicación de la prueba piloto con la escala de usabilidad (con el programa, después de la entrega) | Tercero y posterior |
| Comunicación | — | Informe del trabajo de grado, presentación al director y repositorio público del proyecto | Transversal |

*Fuente: elaboración propia a partir de [3].*

## Población, muestra y unidades de análisis

El universo son los estudiantes y docentes de los programas de
Instrumentación Quirúrgica. La población la conforman los estudiantes y
docentes del programa de Instrumentación Quirúrgica de la CURN, destinatarios
directos del sistema. En el diagnóstico participaron tres estudiantes del
programa, responsables de la documentación de las técnicas quirúrgicas, con el
acompañamiento de una docente, su tutora; fueron las mismas en todas las
reuniones y en la sesión de fotos.

Para la escala de usabilidad y la prueba piloto, la muestra se toma por
conveniencia (muestreo no probabilístico): los estudiantes y docentes que
participen en la presentación de la plataforma que hace el programa.
**Criterios de inclusión:** estar matriculado en el programa o ser docente del
programa, ser mayor de edad (en el MVP la plataforma solo admite cuentas de
mayores de 18 años), usar la plataforma durante la sesión y firmar el
consentimiento informado. **Criterio de exclusión:** haber participado en el desarrollo del
ecosistema o en la documentación de sus técnicas, para no sesgar la valoración.
El número de participantes se registra al aplicar los instrumentos, después de
la entrega de este informe.

La evaluación técnica no trabaja con participantes, sino con tres unidades de
análisis: las 125 fotos de las mesas de Mayo de las cinco técnicas de Cirugía
General, tomadas en tres rondas en el laboratorio y divididas por ronda en
entrenamiento, validación y prueba (desarrollo de SIVRI); las 153 preguntas
del banco de evaluación del chat (desarrollo de SIMIQ3D); y las dieciocho
técnicas del catálogo de DataIQ.

## Variables y categorías de análisis

La Tabla V define, para cada objetivo, la variable o categoría
de análisis, su tipo, cómo se mide y su referencia o meta.

**TABLA V. Variables y categorías de análisis por objetivo**

| Objetivo | Variable o categoría | Tipo | Cómo se mide | Referencia o meta |
|---|---|---|---|---|
| 1 | Necesidades de práctica y de verificación de los estudiantes, y criterios de registro de las técnicas | Categorías (cualitativa) | Acuerdos de las reuniones de trabajo (Anexo A) | — |
| 2 | Origen de cada dato de las técnicas (tomado, corregido o propuesto) | Categoría | Matriz de registro | Todo dato con su origen |
| 3 | Interoperabilidad entre módulos | Categoría | Acceso de SIMIQ3D y SIVRI a DataIQ solo por su API, comprobado en sus pruebas | Ningún acceso directo a otra base |
| 4 | Funcionamiento de cada módulo | Cuantitativa | Pruebas automatizadas superadas en cada cambio | Todas superadas |
| 5 | Desempeño del detector: precisión, exhaustividad, mAP@0.5 y mAP@0.5:0.95 | Cuantitativa (0 a 1) | Fotos de la Ronda 3, no usadas para entrenar | Antecedentes con conjuntos de prueba por sesión [4], [26], [51] |
| 5 | Técnica reconocida y avisos en mesas bien armadas | Cuantitativa (conteos) | Fotos de las rondas 2 y 3 | Ningún aviso en una mesa bien armada |
| 5 | Exactitud del chat | Cuantitativa (proporción) | Banco de preguntas con su respuesta esperada | Ninguna frase sin respaldo en los datos |
| 5 | Tiempo de respuesta del chat | Cuantitativa (segundos) | Peticiones al chat en producción | Escena antes de un segundo |
| 6 | Usabilidad (en la prueba piloto) | Cuantitativa (0 a 100) | Escala de Usabilidad del Sistema en español [31] | 68 o más [17], [18] |
| 6 | Pertinencia pedagógica (en la prueba piloto) | Ordinal (escala Likert de 5 puntos) | Cuestionario tipo Likert redactado por el equipo (Anexo E) | — |

*Fuente: elaboración propia.*

## Desarrollo metodológico por objetivo específico

**Objetivo 1 (diagnóstico).** Se realizaron tres reuniones de trabajo con las
tres estudiantes del programa de Instrumentación Quirúrgica y su docente
tutora, en las que se indagó cómo practican y verifican los estudiantes la
distribución del instrumental y qué dato de cada técnica importa al programa;
sus acuerdos se registran en la Tabla XVIII (Anexo A). Los datos fueron
cualitativos: la necesidad de los estudiantes (no cuentan con herramientas
para practicar y verificar la distribución del instrumental fuera del
laboratorio) y los criterios para registrar las técnicas. El resultado fue la delimitación del proyecto en tres módulos y el
criterio de registrar la posición del instrumental en la mesa y no su
cantidad.

**Objetivo 2 (alcance).** Se realizó una revisión documental de las técnicas
entregadas por el programa: dieciocho técnicas de cinco especialidades, con su
instrumental, suturas, equipos, dispositivos y arreglos de mesa. Como
instrumento se construyó una matriz de registro con una hoja por tipo de dato,
en la que cada mesa y cada objeto indica su origen: tomado de la
documentación, corregido con información que la misma documentación aclara, o
propuesto cuando la fuente no lo incluye o no es consistente. En el tercer
corte, las mesas de Mayo de las cinco técnicas de Cirugía General se rehicieron
con las listas de instrumental que entregó el programa y con las fotos de las
mesas armadas en el laboratorio.

**Objetivo 3 (diseño).** A partir del alcance se diseñaron la arquitectura del
ecosistema y el modelo de datos de DataIQ, y se definió que SIVRI y SIMIQ3D solo
acceden a sus datos mediante su API. Las decisiones se registraron con sus
alternativas y su justificación (Anexos A, B y D).

**Objetivo 4 (desarrollo).** Cada módulo se construyó de forma iterativa e
incremental: cada pieza se desarrolló junto con sus pruebas automatizadas y se
integró a la rama principal del repositorio mediante una solicitud de cambio
(PR) revisada, solo cuando sus pruebas se superaron. En el tercer corte se
desarrollaron el frontend de DataIQ, SIMIQ3D (visor tridimensional, modelos 3D
y chat) y SIVRI (dataset, detector, validación de la mesa y frontend).

**Objetivo 5 (evaluación técnica).** El detector se evaluó con la precisión,
la exhaustividad, el mAP@0.5 y el mAP@0.5:0.95 sobre las fotos de la Ronda 3,
que no se usaron para entrenar, y la validación de la mesa con el
reconocimiento de la técnica y los avisos en las mesas bien armadas. El chat se
evaluó con un banco de 153 preguntas y con el tiempo de respuesta en
producción.

**Objetivo 6 (diseño de la prueba piloto).** El objetivo entrega el diseño
de la prueba, que se aplica después de este informe. En ella, los estudiantes
y docentes del programa usan la plataforma en una sesión guiada: exploran una
mesa en SIMIQ3D y, en el laboratorio, arman y validan una mesa con SIVRI. Al
terminar responden dos instrumentos (Anexo E): la versión en español de la
Escala de Usabilidad del Sistema [31], de diez afirmaciones valoradas en una
escala de cinco puntos, y un cuestionario tipo Likert de pertinencia
pedagógica, elaborado por el
equipo a partir de los objetivos de aprendizaje del programa. Su validación
por juicio de expertos con docentes de Instrumentación Quirúrgica queda para
después del MVP (decidido por Mauricio Lugo el 2026-11-23); en la prueba
piloto del MVP se aplica como lo redactó el equipo.

La Tabla VI resume, para cada objetivo específico, la
técnica, el instrumento de registro y el producto esperado.

**TABLA VI. Metodología por objetivo específico**

| Objetivo | Técnica | Instrumento | Resultado |
|---|---|---|---|
| 1. Diagnóstico | Reuniones de trabajo con las estudiantes y su docente tutora | Registro de acuerdos (Tabla XVIII, Anexo A) | Necesidades de práctica y de verificación, alcance y criterio de registro |
| 2. Alcance | Revisión documental y sesión de fotos | Matriz de registro de técnicas; fotos de las mesas con marcadores | Catálogo y mesas de Mayo verificables |
| 3. Diseño | Modelado de datos y de arquitectura | Registro de decisiones técnicas | Modelo entidad-relación y arquitectura |
| 4. Desarrollo | Desarrollo iterativo con pruebas | Pruebas automatizadas y revisión de cada cambio | DataIQ, SIMIQ3D y SIVRI |
| 5. Evaluación técnica | Medición del detector y del chat | Fotos de prueba (Ronda 3), banco de 153 preguntas y peticiones al chat en producción | Desempeño del detector, exactitud y tiempo de respuesta del chat |
| 6. Diseño de la prueba piloto | Diseño de la sesión guiada y de las encuestas | Escala de Usabilidad del Sistema, cuestionario tipo Likert de pertinencia pedagógica y consentimiento informado (Anexo E) | Prueba piloto lista para aplicar |

*Fuente: elaboración propia.*

## Análisis de datos

Los acuerdos de las reuniones de diagnóstico se sintetizaron por categoría en
la Tabla XVIII. La matriz de registro de las técnicas se verificó con un programa
que valida la consistencia de cada técnica antes de cargarla en la base de
datos. El detector se valoró con la mAP a un umbral de intersección sobre unión
de 0,5 y con la mAP promedio entre 0,5 y 0,95, por clase y en conjunto. La
exactitud del chat es la proporción de preguntas del banco respondidas como
indica su respuesta esperada (la acción del visor, la técnica, el instrumento y
los puntos que la respuesta tiene que decir), junto con las frases sin
respaldo en los datos de DataIQ y el tiempo hasta la escena, hasta el primer
texto y hasta la respuesta completa; el registro de conversaciones, sin la
cuenta de quien pregunta, permite repetir la medición con preguntas reales. La
puntuación de la Escala de Usabilidad del Sistema se calcula con el
procedimiento de Brooke [17]: a las afirmaciones impares se les resta uno, a
cinco se le restan las afirmaciones pares y la suma se multiplica por 2,5,
para obtener un valor entre 0 y 100; un puntaje superior a 68 se considera por
encima del promedio [18]. Las respuestas del cuestionario de pertinencia se
analizan con estadística descriptiva (mediana y distribución de las respuestas
por ítem).

## Consideraciones éticas

Conforme a la Resolución 8430 de 1993 [43], el estudio se clasifica como
investigación sin riesgo: no hay intervención sobre las personas y la
evaluación con usuarios se limita a encuestas anónimas.

Las reuniones del diagnóstico y la sesión de fotos se hicieron con las tres
estudiantes del programa y su docente tutora en su papel de colaboradoras del
proyecto: aportaron la documentación de las técnicas, las listas de
instrumental y las mesas armadas que se fotografiaron. No fueron sujetos de
investigación ni se les aplicó un instrumento; de esas reuniones solo se
registraron los acuerdos de trabajo (Tabla XVIII), sin datos personales, y las
fotos muestran la mesa y el instrumental, sin personas.

En la prueba piloto, antes de usar la plataforma y responder, cada
participante firma un consentimiento
informado (Anexo E) que explica el propósito de la prueba, que su participación
es voluntaria, que puede retirarse en cualquier momento y que sus respuestas se
analizan sin su nombre. Como todos los participantes son mayores de edad, no se
requiere asentimiento. Los datos de los usuarios del sistema se tratan
conforme a la Ley 1581 de 2012 [40] y a la política de datos de la CURN: el
registro exige aceptar el aviso de privacidad y el sistema conserva la fecha y
la versión aceptadas, y las preguntas al chat de SIMIQ3D se guardan sin la
cuenta de quien pregunta, como lo informa la propia plataforma. Las fotos del
laboratorio muestran solo la mesa y el instrumental, sin personas; su
publicación como dataset abierto requiere la autorización del programa. El
contenido clínico es autoría del programa de Instrumentación Quirúrgica [44], y
lo que no proviene de su documentación queda marcado para su validación.

## Uso de inteligencia artificial

El proyecto usó asistentes de inteligencia artificial como herramientas de
apoyo en el desarrollo, siempre bajo la dirección y la revisión humana de los
autores: cada producto se planteó, se revisó y se corrigió por la persona
responsable antes de integrarse, y ningún resultado se aceptó sin esa
revisión. La Tabla VII resume en qué trabajo se usó cada asistente.

**TABLA VII. Uso de asistentes de inteligencia artificial en el desarrollo**

| Trabajo | Asistente | Papel de la persona responsable |
|---|---|---|
| Backend de DataIQ, SIMIQ3D y SIVRI; infraestructura de despliegue; frontend de SIMIQ3D; documentación del repositorio | Claude Code (Anthropic), con el modelo Claude Opus 5.5 | Mauricio Lugo definió cada funcionalidad, revisó el código y las pruebas, y aprobó cada cambio antes de integrarlo |
| Diseño de las pantallas (prototipos) | Claude Code | Mauricio Lugo eligió la dirección visual y aprobó cada pantalla |
| Modelado 3D del instrumental de SIMIQ3D, en Blender, sobre las fotos del programa de Instrumentación Quirúrgica | Claude Code y Codex (OpenAI) | Mauricio Lugo aportó las referencias, comparó cada modelo con las fotos y con las referencias, pidió las correcciones y aprobó uno por uno los 16 modelos |
| Etiquetado y revisión del dataset de SIVRI y entrenamiento del detector YOLO | Claude Code y Codex | Mauricio Lugo revisó las cajas y los casos dudosos y decidió los criterios (por ejemplo, separar las dos pinzas de disección en clases distintas) |

| Redacción de este documento a partir de la documentación del repositorio | Claude Code | Mauricio Lugo revisó cada sección contra el repositorio y las fuentes, y aprobó el texto |

*Fuente: elaboración propia.*

El primer juego de modelos 3D de SIMIQ3D (Guebriel Garces, 2026-10-30) se
modeló a mano en Blender, sin asistentes de IA.

**Cómo se trabajó con los asistentes.** Claude Code (Anthropic) y Codex
(OpenAI) trabajan sobre el repositorio y la terminal: leen el código, proponen
cambios, corren las pruebas y, en el modelado, controlan Blender por un
servidor MCP [37] que les muestra la escena en vivo. Cada pieza siguió el mismo
ciclo: la persona responsable define qué se quiere y con qué criterio, el
asistente propone, ella revisa el resultado (el código y las pruebas, o
capturas antes y después, o el modelo junto a la foto), pide correcciones y
aprueba; nada entró al repositorio sin un PR revisado. Los asistentes tienen
cupos de uso por periodo; cuando uno se agotaba, el trabajo pasaba al otro con
un documento de contexto (reglas del proyecto, decisiones tomadas, estado y
siguiente paso), de modo que no se perdían las decisiones. Mauricio Lugo
eligió a Codex para el modelado 3D y el trabajo de visión del dataset, porque
al comparar consideró mejores sus resultados en esas tareas, y a Claude Code
para el backend, la integración y la documentación.

<!-- Juan Caraballo agrega aquí las filas de su trabajo (frontend de DataIQ y shell de navegación). -->

Además, el chat de SIMIQ3D usa un modelo de lenguaje (Qwen3-VL 8B [33],
ejecutado con Ollama en el Servidor PC2) como parte del producto: interpreta la
pregunta y redacta la respuesta con los datos que consulta en DataIQ, y cada
frase se verifica contra esos datos antes de mostrarse (ver el desarrollo de
SIMIQ3D).

## Limitaciones y riesgos

La documentación clínica disponible no incluía el arreglo de mesa de algunas
técnicas y presentaba inconsistencias en otras, por lo que parte del dataset de
DataIQ se construyó como propuesta y depende de la validación del programa. Las
125 fotos de SIVRI se tomaron el mismo día, en tres rondas, con el mismo
instrumental y el mismo celular: la división por ronda separa las tomas, pero
no es una sesión independiente. Las fotos «Bien armada» de las tres rondas
sirvieron además de referencia para ubicar las piezas en la mesa, y la Ronda 3
se usó en la prueba de más de una corrida del detector, por lo que los
resultados de SIVRI sobre esas fotos describen su desempeño con las mesas de
referencia y no son una medición independiente. En las mesas con errores,
los errores se pusieron al azar sin registrarlos, de modo que la validación se
presenta como diagnóstico técnico y no como exactitud frente a errores
conocidos. El banco de preguntas del chat guió también su desarrollo. El
backend de SIVRI corre en un computador del equipo (Servidor PC1), del que
depende su disponibilidad. La escala de usabilidad y la prueba piloto se
aplican después de la entrega de este informe, y su evaluación se hará con
estudiantes y docentes de un solo programa, por lo que sus resultados no podrán
generalizarse. El cuestionario de pertinencia pedagógica se aplica sin
validación por juicio de expertos, que queda para después del MVP, así que sus
resultados son exploratorios. Los 16 modelos tridimensionales se construyeron en Blender sobre
las fotos del programa, con scripts y con asistencia de Claude Code y de Codex,
y Mauricio Lugo los aprobó uno por uno; la escena se dibuja con Three.js [52].

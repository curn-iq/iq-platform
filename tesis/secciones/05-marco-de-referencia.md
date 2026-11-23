# Marco de referencia

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

- **Marco teórico:** aprendizaje procedimental y retroalimentación en
  simulación quirúrgica; visión por computador aplicada al reconocimiento de
  instrumental (con la tabla de la evolución de YOLO); gamificación en el
  aprendizaje del instrumental; visualización tridimensional interactiva en
  educación en salud (con la figura del ciclo de aprendizaje).
- **Marco conceptual:** los términos del proyecto (técnica, mesa de Mayo,
  CUPS, etc.).
- **Marco legal:** la tabla del marco normativo (protección de datos,
  investigación en salud, licencias).

## Fuentes en el repositorio

- Protección de datos: [`docs/privacidad.md`](../../docs/privacidad.md).
- Licencias: [`README.md`](../../README.md), «Licencia».
- Las referencias: [`12-referencias.md`](12-referencias.md).
-->

El presente marco articula tres cuerpos de conocimiento que sustentan el ecosistema propuesto: la teoría del aprendizaje procedimental y el papel de la retroalimentación en la simulación quirúrgica, los fundamentos técnicos de la visión por computador aplicada al reconocimiento de instrumental, y las tecnologías de visualización tridimensional interactiva orientadas a la educación en ciencias de la salud. A ello se suman la delimitación conceptual del dominio clínico y el marco normativo que regula tanto el ejercicio de la Instrumentación Quirúrgica en Colombia como el tratamiento de datos en investigación con participantes humanos.

## Marco teórico

### Aprendizaje procedimental y retroalimentación en simulación quirúrgica

La adquisición de competencias procedimentales en ciencias de la salud responde al modelo de práctica deliberada [19], [1], según el cual la mejora del desempeño no depende de la repetición en sí misma, sino de la repetición acompañada de retroalimentación específica, inmediata y orientada a la corrección del error. En el contexto quirúrgico esta condición se materializa en la supervisión del instructor durante los ejercicios de simulación.

La evidencia disponible confirma que la retroalimentación oportuna es la variable más determinante en la consolidación de habilidades técnicas quirúrgicas. Tee et al., en un estudio observacional retrospectivo desarrollado en un hospital de tercer nivel, documentaron que la retroalimentación del instructor en simulación produce mejoras medibles en la curva de aprendizaje, y que su ausencia incrementa significativamente el tiempo requerido para alcanzar competencia procedimental [5]. Yilmaz et al., en un ensayo controlado aleatorizado de cuatro brazos, compararon distintas modalidades de retroalimentación en sistemas educativos automatizados y establecieron que la modalidad empleada incide directamente en los resultados de aprendizaje [6].

El desplazamiento de esta función hacia sistemas automatizados constituye la premisa central del presente proyecto. Mirchi et al. desarrollaron el Virtual Operative Assistant, una plataforma de retroalimentación educativa basada en inteligencia artificial explicable que clasificó correctamente el nivel de competencia de los participantes con una exactitud del 92 %, una especificidad del 82 % y una sensibilidad del 100 %, entregando retroalimentación personalizada sin intervención de un evaluador humano [7]. Posteriormente, Yilmaz et al. demostraron en un ensayo controlado aleatorizado que un sistema de inteligencia artificial multifacético en tiempo real produjo resultados de aprendizaje comparables a la instrucción presencial de expertos, estableciendo la viabilidad de la inteligencia artificial como sustituto funcional de la supervisión directa en entornos de simulación [8]. Una revisión sistemática reciente asocia los sistemas de retroalimentación automatizada en la formación quirúrgica con mejoras de moderadas a grandes en el desempeño técnico, sobre todo en tareas básicas y repetitivas [20].

En el contexto latinoamericano, la brecha entre la formación teórica y la práctica supervisada ha sido documentada específicamente para el programa de Instrumentación Quirúrgica. Arias et al. reportaron que la virtualización de la formación dejó vacíos en el reconocimiento del instrumental por la ausencia de laboratorios físicos, e identificaron barreras socioemocionales —miedo al error e inseguridad— que limitan la participación del estudiante en entornos virtuales [21]. Acevedo Osorio, en un estudio aplicado a la formación de instrumentadores quirúrgicos, documentó el uso de la inteligencia artificial como herramienta didáctica con mejoras en conocimientos, actitudes y prácticas [22]. En Colombia, Bobadilla Huepo y Avendaño Valero diseñaron una evaluación clínica objetiva estructurada para la formación de instrumentadores quirúrgicos [23], y Acevedo-Osorio et al. midieron, con un diseño cuasiexperimental, el efecto de la realidad virtual en las destrezas psicomotoras de estudiantes de Instrumentación Quirúrgica [24].

### Visión por computador aplicada al reconocimiento de instrumental

La detección de objetos es la tarea de visión por computador que consiste en localizar e identificar simultáneamente múltiples instancias de clases predefinidas dentro de una imagen, devolviendo para cada una su clase, sus coordenadas delimitadoras y un valor de confianza asociado. Las arquitecturas de detección se dividen en dos familias: los detectores de dos etapas, que generan primero regiones candidatas y luego las clasifican, y los detectores de una etapa, que resuelven ambas tareas en una sola pasada sobre la imagen. Los segundos sacrifican precisión marginal a cambio de una velocidad de inferencia sustancialmente mayor, condición necesaria para el procesamiento de video en tiempo real.

La familia YOLO (You Only Look Once) [25] constituye la referencia consolidada entre los detectores de una etapa. Una revisión sistemática de su aplicación a la detección de objetos médicos entre 2018 y 2023 documenta su adopción creciente en tareas clínicas y de laboratorio [13]. En el dominio específico del instrumental quirúrgico, Ran et al. aplicaron una variante mejorada de YOLOv7x al conteo de instrumental sobre mesas quirúrgicas, alcanzando alta precisión en condiciones de oclusión parcial [4]. Deol et al. entrenaron un modelo con más de 13 000 imágenes distribuidas en once categorías de instrumentos, validando el conteo automatizado como salvaguarda frente al error humano [26]. Frey et al. evaluaron YOLOv8 en el reconocimiento de instrumental robótico y laparoscópico, reportando velocidades de inferencia de 1,12 milisegundos por fotograma, suficientes para uso intraoperatorio en tiempo real [12].

YOLO26, publicado por Ultralytics en septiembre de 2025, constituye la versión de producción vigente de la familia. Su diseño elimina la Distribution Focal Loss e incorpora inferencia de extremo a extremo sin supresión de no máximos, lo que reduce la latencia y mejora la compatibilidad multiplataforma, con ganancias de hasta un 43 % en velocidad de inferencia sobre CPU respecto a versiones anteriores [2]. Estas características determinan su selección para el módulo SIVRI, orientado a operar sobre hardware institucional sin requerir infraestructura especializada. La Tabla II sintetiza la evolución documentada de la familia en este dominio.

**TABLA II. Evolución de la familia YOLO en la detección de instrumental quirúrgico**

| Versión | Año | Aplicación documentada | Aporte al dominio | Ref. |
|---|---|---|---|---|
| YOLOv7x | 2023 | Conteo de instrumental en mesas quirúrgicas | Precisión sostenida bajo oclusión parcial | [4] |
| YOLOv8 | 2024 | Conteo automatizado en once categorías | Validación con dataset de más de 13 000 imágenes | [26] |
| YOLOv8 | 2025 | Instrumental robótico y laparoscópico | 1,12 ms por fotograma; viable en tiempo real | [12] |
| YOLO26 | 2025 | Versión de producción vigente | Inferencia de extremo a extremo; +43 % en CPU | [2] |

*Fuente: elaboración propia a partir de las referencias citadas.*

### Gamificación en el aprendizaje del instrumental quirúrgico

La gamificación aplicada al reconocimiento de instrumental ha demostrado superioridad frente a la enseñanza tradicional. Masoumian Hosseini et al. condujeron un estudio cuasiexperimental cruzado multiinstitucional con 90 estudiantes, midiendo el desempeño mediante pruebas OSCE, y concluyeron que la instrucción basada en juego mejora tanto el reconocimiento del instrumental como la retención del conocimiento en el tiempo [27]. Este hallazgo fundamenta la retroalimentación inmediata del módulo SIVRI: al validar la mesa armada, el sistema indica qué instrumento falta, cuál sobra y cuál debe moverse, y el porcentaje de instrumentos en su lugar respecto de los esperados para la técnica. El puntaje acumulado y el registro del progreso de cada estudiante quedan fuera del alcance del producto mínimo viable.

### Visualización tridimensional interactiva en educación en salud

La representación de configuraciones espaciales complejas —como la disposición del instrumental sobre la mesa de Mayo— encuentra en la visualización tridimensional interactiva una alternativa superior al material bidimensional estático. Las tecnologías WebGL permiten renderizar escenas tridimensionales directamente en el navegador sin instalación previa ni hardware especializado, condición determinante en contextos universitarios con recursos limitados. Gutiérrez-Sánchez et al. desarrollaron y validaron una plataforma web interactiva de modelado tridimensional para la enseñanza de la anatomía, documentando su viabilidad técnica en equipos de consumo [14].

Odogwu et al., en una revisión sistemática sobre simulación en realidad virtual aplicada al aprendizaje anatómico, reportan mejoras consistentes en los resultados de aprendizaje frente a métodos tradicionales [15]. En el dominio específico de la instrumentación quirúrgica, Camargo et al. compararon el entrenamiento en realidad virtual con el entrenamiento tradicional, aportando evidencia directamente transferible al contexto de este proyecto [16].

La incorporación de interfaces conversacionales a estos entornos constituye la frontera actual del campo. Chheang et al. integraron asistentes virtuales basados en inteligencia artificial generativa en entornos inmersivos para la enseñanza de la anatomía, documentando incrementos en el sentido de presencia y en la usabilidad percibida [28]. El módulo SIMIQ3D adopta esta aproximación con una restricción deliberada: el modelo de lenguaje interpreta la intención expresada por el usuario y redacta la respuesta con los datos que el sistema consulta en DataIQ, y cada frase se verifica contra esos datos antes de mostrarse; la escena se compone con modelos tridimensionales elaborados previamente, sin generar geometría de forma neural. Esta decisión elimina el riesgo de alucinación morfológica sobre instrumental clínico y preserva la trazabilidad del contenido presentado al estudiante.

La articulación de los tres módulos cubre el ciclo completo del aprendizaje procedimental, tal como se representa en la Fig. 1.

> **[Imagen]** Figura 1 del segundo corte: ciclo de aprendizaje procedimental (estudiar en SIMIQ3D, practicar y validar en SIVRI, con DataIQ como fuente).
>
> *Fig. 1. Ciclo de aprendizaje procedimental cubierto por los tres módulos del ecosistema. Fuente: elaboración propia.*

### Aprendizaje autónomo y práctica deliberada

El aprendizaje autónomo, o autodirigido, es aquel en que el estudiante toma la
iniciativa de diagnosticar lo que necesita aprender, fijar sus metas, elegir
sus recursos y valorar sus resultados; en términos del aprendizaje autorregulado, el estudiante planifica, controla y evalúa su propio desempeño [29]. En las profesiones de la salud, una
revisión sistemática de 59 estudios comparativos encontró que el aprendizaje
autodirigido mejora la adquisición de conocimientos frente a los métodos
tradicionales, con efectos menores en las habilidades, y que funciona mejor
cuando el estudiante elige sus propios recursos [11]. Para las habilidades
procedimentales, la práctica deliberada explica que el desempeño experto en
medicina no viene de la repetición, sino de la práctica con una tarea bien
definida y con retroalimentación inmediata e informativa [1]. Las dos ideas
definen lo que el ecosistema busca ofrecer: que el estudiante practique solo,
cuando y donde quiera (aprendizaje autónomo), y que esa práctica tenga
retroalimentación (práctica deliberada).

### Usabilidad y su medición

La usabilidad percibida se mide con la Escala de Usabilidad del Sistema (SUS),
de diez afirmaciones [17]. Bangor et al., con casi una década de datos de la
escala aplicada a productos en todas las fases de su desarrollo, confirmaron
su confiabilidad y propusieron interpretar su puntaje con adjetivos y rangos de
aceptabilidad, con 68 como valor de referencia [18]; Sauro y Lewis ofrecen además las referencias estadísticas para interpretar el puntaje con muestras pequeñas [30]. Para participantes
hispanohablantes existe una versión en español traducida, adaptada y validada,
con una consistencia interna aceptable (alfa de Cronbach de 0,812) [31], que es
la que usa este trabajo.

### Modelos de lenguaje anclados a datos

Los modelos de lenguaje redactan textos fluidos, pero pueden inventar
información con apariencia correcta. En preguntas médicas, anclar la respuesta
a documentos recuperados de una fuente verificable mejora la exactitud de
varios modelos frente a responder solo con lo aprendido en su entrenamiento
[32]. SIMIQ3D aplica esa idea: el modelo de lenguaje (Qwen3-VL [33]) recibe
los datos de DataIQ sobre lo que se pregunta y cada frase de su respuesta se
revisa contra ellos antes de mostrarse.

## Marco conceptual

A continuación se delimitan los términos clínicos y técnicos empleados de forma recurrente a lo largo del documento.

**Aprendizaje autónomo.** Aprendizaje en que el estudiante toma la iniciativa de definir lo que necesita aprender, sus metas, sus recursos y cómo valora sus resultados [11]; en este proyecto, practicar la distribución del instrumental sin depender de la presencia del docente.

**Instrumentación Quirúrgica.** Profesión del área de la salud cuya función comprende la planeación, organización, dirección, ejecución, supervisión y evaluación de las actividades propias del acto quirúrgico como parte integral del equipo de salud, según la definición del artículo 2 de la Ley 784 de 2002 [34].

**Tiempo quirúrgico.** Cada una de las fases secuenciales que componen un procedimiento quirúrgico. Los tiempos fundamentales son la diéresis, o separación de los tejidos; la hemostasia, o control del sangrado; la prensión, o sujeción de estructuras; la separación, o exposición del campo operatorio; y la síntesis, o afrontamiento de los tejidos. Cada tiempo exige un conjunto específico de instrumental.

**Mesa de Mayo.** Superficie de trabajo situada sobre el campo operatorio que contiene el instrumental de uso inmediato y frecuente durante el procedimiento. Su disposición sigue un ordenamiento espacial normalizado que el instrumentador debe reproducir con precisión.

**Mesa de reserva.** Superficie auxiliar que contiene el instrumental complementario, los insumos y el material no requerido de forma inmediata, desde la cual se reabastece la mesa de Mayo durante la intervención.

**Distribución de instrumental.** Disposición física y ordenada del instrumental sobre las mesas quirúrgicas conforme al tiempo quirúrgico y al tipo de procedimiento. Constituye el objeto de aprendizaje central de este proyecto.

**Técnica quirúrgica.** Descripción normalizada de un procedimiento que comprende la posición del paciente, el tipo de anestesia, el instrumental requerido, las suturas, los equipos biomédicos, los dispositivos médico-quirúrgicos y la secuencia de pasos operatorios.

**Visión por computador.** Campo de la inteligencia artificial orientado a dotar a los sistemas computacionales de la capacidad de interpretar y extraer información significativa a partir de imágenes o secuencias de video.

**Detección de objetos.** Tarea de visión por computador que localiza e identifica simultáneamente múltiples instancias de clases predefinidas dentro de una imagen, devolviendo para cada una su clase, sus coordenadas delimitadoras y un valor de confianza asociado.

**Inferencia.** Proceso mediante el cual un modelo previamente entrenado procesa una entrada nueva y produce una predicción. Su duración, medida en milisegundos por fotograma, determina la viabilidad del sistema en tiempo real.

**mAP (mean Average Precision).** Métrica estándar de evaluación en detección de objetos que promedia la precisión media obtenida en cada clase del conjunto, permitiendo comparar el desempeño global de distintos modelos sobre un mismo dataset.

**Fine-tuning.** Reentrenamiento parcial de un modelo preentrenado sobre un conjunto de datos específico del dominio de aplicación, con el fin de adaptarlo a clases no contempladas en su entrenamiento original.

**Dataset.** Conjunto estructurado de datos organizado para su consulta o procesamiento automático. En este proyecto, DataIQ constituye el dataset de técnicas quirúrgicas del programa: sus técnicas, su instrumental y sus arreglos de mesa. Es distinto del conjunto de datos visuales con el que se entrenará el modelo de detección de SIVRI.

**Práctica deliberada.** Práctica de una tarea bien definida, con retroalimentación inmediata e informativa, orientada a mejorar el desempeño [1].

**Retroalimentación formativa.** Información devuelta al estudiante durante el proceso de aprendizaje con el propósito de corregir el desempeño, en oposición a la retroalimentación sumativa, orientada a la calificación final.

**Gamificación.** Incorporación de elementos propios del diseño de juegos —puntaje, niveles, progresión— en contextos ajenos al juego, con el fin de incrementar la motivación y el compromiso del usuario.

**Modelado 3D compositivo.** Técnica de construcción de escenas tridimensionales mediante el ensamblaje programático de modelos elaborados previamente, en oposición a la generación neural de geometría a partir de descripciones textuales.

**Escala de Usabilidad del Sistema (SUS).** Instrumento estandarizado de diez ítems que produce una puntuación única entre 0 y 100 para evaluar la usabilidad percibida de un sistema; un puntaje superior a 68 se considera por encima del promedio [17], [18].

**Ecosistema tecnológico modular.** Conjunto de módulos de software independientes, cada uno con su propio backend y su propia base de datos, que se integran mediante interfaces de programación y una identidad de usuario compartida.

**Capa de navegación.** Punto de entrada único al ecosistema que reúne los tres módulos y muestra a cada usuario lo que su rol le permite. No es un módulo, porque no tiene backend ni base de datos propios.

**API (interfaz de programación de aplicaciones).** Conjunto de operaciones que un sistema expone para que otros programas consulten o modifiquen sus datos. La API de DataIQ es la única vía por la que SIVRI y SIMIQ3D acceden a las técnicas quirúrgicas.

**Arquitectura hexagonal.** Estilo de arquitectura de software que separa el núcleo de reglas de negocio de los componentes externos —bases de datos, interfaces y servicios— mediante puertos y adaptadores.

**Versión de una técnica.** Estado del contenido de una técnica quirúrgica en un momento dado. Una técnica conserva su historial de versiones y solo la versión publicada se muestra a los estudiantes.

**CUPS.** Clasificación Única de Procedimientos en Salud: codificación oficial de los procedimientos en salud en Colombia [35].

La Fig. 2 ilustra la aplicación de estos conceptos sobre un caso concreto: el arreglo de la mesa de Mayo correspondiente a una mastectomía, tomado de la documentación de técnicas elaborada por el programa de Instrumentación Quirúrgica de la CURN.

> **[Imagen]** Figura 2 del segundo corte: esquema de la mesa de Mayo de una mastectomía con posiciones numeradas.
>
> *Fig. 2. Disposición del instrumental sobre la mesa de Mayo con posiciones numeradas. Fuente: adaptado de la documentación de técnicas quirúrgicas del programa de Instrumentación Quirúrgica de la CURN.*

Los términos técnicos que usan el desarrollo y los resultados del tercer corte:

**Caja delimitadora y etiqueta.** Rectángulo que encierra un objeto en una imagen, con la clase a la que pertenece; es la anotación con que se entrena y se evalúa un detector.

**Exhaustividad (recall) y precisión.** La exhaustividad es la proporción de objetos presentes que el detector encuentra; la precisión, la proporción de detecciones que son correctas. El mAP@0.5 usa un umbral de intersección sobre unión de 0,5, y el mAP@0.5:0.95 promedia los umbrales de 0,5 a 0,95.

**Homografía.** Transformación proyectiva entre dos planos que permite llevar la foto de una superficie tomada en ángulo a una vista cenital, y volver.

**Intersección sobre unión (IoU).** Área común de dos regiones dividida por el área de su unión; mide cuánto coincide una detección con su anotación.

**Marcador fiducial ArUco.** Cuadrado binario impreso que un algoritmo identifica en la imagen con su número y sus esquinas, aun con oclusión parcial [36]; con cuatro marcadores en las esquinas de la mesa se calcula su posición en la foto.

**Modelo de lenguaje anclado a datos.** Uso de un modelo de lenguaje que redacta sus respuestas a partir de datos recuperados de una fuente verificable, y no solo de lo aprendido en su entrenamiento [32].

**Oclusión ambiental.** Sombreado que oscurece las zonas a las que llega menos luz (ranuras, encastres, cuellos) y que se calcula una vez y se guarda en el modelo 3D para que sus detalles se vean en tiempo real.

**Protocolo de contexto de modelos (MCP).** Protocolo abierto con el que un asistente de inteligencia artificial se conecta con herramientas externas, como un programa de modelado 3D [37].

**Segmentación de imágenes.** Separación de los píxeles que pertenecen a un objeto; un modelo como SAM 2 la produce a partir de una indicación, por ejemplo una caja [38].

**Umbral de confianza.** Valor mínimo de la confianza que asigna el detector para aceptar una detección; uno alto descarta detecciones falsas, pero también detecciones correctas hechas con poca confianza.

## Marco legal

El desarrollo del sistema se enmarca en cuatro dominios normativos: la regulación del ejercicio y la enseñanza de la Instrumentación Quirúrgica en Colombia, la normativa de educación superior, el régimen de protección de datos personales y las disposiciones éticas aplicables a la investigación con participantes humanos.

La Ley 784 de 2002, que reforma la Ley 6.ª del 14 de enero de 1982, reglamenta el ejercicio de la Instrumentación Quirúrgica Profesional en Colombia. Su artículo 4 establece que la enseñanza de la profesión solo puede ser impartida por instituciones autorizadas por el Gobierno Nacional, y su artículo 8 dispone la obligación de actualización permanente del personal en ejercicio [34]. Ambas disposiciones delimitan el ámbito institucional en que se inscribe este proyecto y respaldan la pertinencia de herramientas orientadas al fortalecimiento de la formación profesionalizante.

La Ley 30 de 1992, que organiza el servicio público de la educación superior en Colombia, enmarca el presente trabajo como actividad académica de la institución [39].

En materia de protección de datos, la Ley 1581 de 2012 [40] y su decreto reglamentario 1377 de 2013 [41] regulan el tratamiento de datos personales y establecen los principios de finalidad, libertad, veracidad, transparencia y seguridad. En los proyectos académicos de sus estudiantes, la CURN es la responsable del tratamiento, conforme a su Política de Tratamiento de Datos Personales, aprobada por el Consejo Superior con el Acuerdo 02 del 7 de julio de 2017 [42]. El sistema almacena datos de identificación de los usuarios, por lo que su tratamiento se sujeta a la autorización previa, expresa e informada del titular y se limita a las finalidades educativas declaradas.

Las actividades de evaluación con docentes y estudiantes se rigen por la Resolución 8430 de 1993 del Ministerio de Salud, que establece las normas científicas, técnicas y administrativas para la investigación en salud en Colombia [43]. Conforme a su artículo 11, el presente proyecto se clasifica como investigación sin riesgo, al no realizar intervención alguna sobre variables biológicas, fisiológicas o psicológicas de los participantes. No obstante, se garantizan el consentimiento informado, la confidencialidad de la información recolectada y el derecho de los participantes a retirarse del estudio en cualquier momento.

Finalmente, el software desarrollado y la documentación clínica que alimenta el módulo DataIQ constituyen obras protegidas por la Ley 23 de 1982 sobre derechos de autor [44]. La autoría del contenido clínico corresponde al equipo del programa de Instrumentación Quirúrgica, mientras que la del software corresponde al equipo de Ingeniería de Sistemas; el código se distribuye bajo la licencia MIT [45], salvo el del módulo SIVRI, que usa la licencia AGPL-3.0 [46] porque depende de la biblioteca Ultralytics, con el fin de garantizar la reproducibilidad del desarrollo y su continuidad por parte de futuros equipos de la institución. La Tabla III resume el marco normativo aplicable.

**TABLA III. Marco normativo aplicable al proyecto**

| Norma | Materia | Incidencia en el proyecto |
|---|---|---|
| Ley 784 de 2002 [34] | Ejercicio y enseñanza de la Instrumentación Quirúrgica | Delimita el ámbito institucional y respalda la pertinencia formativa |
| Ley 30 de 1992 [39] | Servicio público de la educación superior | Enmarca el proyecto como actividad académica de la CURN |
| Ley 1581 de 2012 [40] y Decreto 1377 de 2013 [41] | Protección de datos personales | Rige el tratamiento de datos de usuarios del sistema |
| Política de Tratamiento de Datos Personales de la CURN (Acuerdo 02 de 2017) [42] | Tratamiento de datos en la institución | La CURN es la responsable del tratamiento en el proyecto |
| Resolución 8430 de 1993 [43] | Investigación en salud | Clasifica el estudio sin riesgo y exige consentimiento informado |
| Ley 23 de 1982 [44] | Derechos de autor | Protege el software y la documentación clínica generada; el código se publica con licencia MIT [45], y SIVRI con AGPL-3.0 [46] |

*Fuente: elaboración propia.*

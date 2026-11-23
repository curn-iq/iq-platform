# Introducción

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

- El contexto: el aprendizaje de la distribución del instrumental quirúrgico
  en la mesa y la necesidad de práctica fuera del laboratorio.
- Qué es el ecosistema y qué hace cada módulo.
- Cómo está organizado el documento.

## Fuentes en el repositorio

- [`README.md`](../../README.md) del repositorio, «Descripción».
- [`PRODUCT.md`](../../PRODUCT.md).
-->

La formación en Instrumentación Quirúrgica exige el dominio preciso de la
distribución del instrumental según cada tiempo quirúrgico: diéresis,
prensión, hemostasia, separación y síntesis. Este conocimiento, crítico para
la seguridad del paciente y la eficiencia operatoria, se adquiere en
laboratorios de simulación bajo supervisión docente directa. Fuera de esos
espacios, los estudiantes del programa de Instrumentación Quirúrgica de la
Corporación Universitaria Rafael Núñez (CURN) no cuentan con mecanismos
objetivos que validen su práctica autónoma. La retroalimentación, cuando
existe, depende de la disponibilidad del docente, condición que limita la
práctica deliberada [1] y prolonga la curva de aprendizaje hacia la
competencia clínica.

Frente a esta brecha, el proyecto desarrolló un **ecosistema tecnológico
modular** de tres módulos complementarios. **DataIQ** (Plataforma y Dataset de
Técnicas Quirúrgicas) digitaliza y gestiona las técnicas del programa, con su
instrumental, suturas, equipos, dispositivos y arreglos de mesa, y es la fuente
única de información de los otros dos. **SIMIQ3D** (Sistema Interactivo de
Modelado e Instrumentación Quirúrgica 3D) presenta en un visor tridimensional
la mesa de Mayo de cada técnica y responde en lenguaje natural las preguntas
del estudiante; sirve fuera del laboratorio, a quien no tiene una mesa.
**SIVRI** (Sistema Inteligente de Visión y Retroalimentación para
Instrumentación Quirúrgica) aplica visión por computador con YOLO26 [2] para
reconocer el instrumental de una mesa armada y decir qué falta, qué sobra y qué
debe moverse; sirve dentro del laboratorio, cuando no hay un docente al lado.
Cada módulo tiene su propio backend y su propia base de datos, y se integran
mediante la API de DataIQ, una sesión de usuario compartida y una capa de
navegación común. El alcance del producto mínimo viable (MVP) es la mesa de
Mayo de cinco técnicas de Cirugía General.

El trabajo se desarrolló en tres cortes académicos con la metodología de
investigación en ciencia del diseño [3]. En el primero se diagnosticó el
problema con el programa y se diseñó el ecosistema; en el segundo se construyó
el backend de DataIQ y los prototipos de las pantallas; y en el tercero se
completaron DataIQ, SIMIQ3D y SIVRI, se fotografiaron las mesas reales en el
laboratorio y se evaluaron técnicamente los módulos. El documento presenta el
problema, la justificación y los objetivos; el marco de referencia; la
metodología; el desarrollo de cada módulo; los resultados por objetivo; su
discusión; las conclusiones y las recomendaciones.

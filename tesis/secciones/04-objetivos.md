# Objetivos

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

- Objetivo general.
- Los seis objetivos específicos.
- Cómo se cumplen por cortes (estrategia por fases).

## Fuentes en el repositorio

- El avance de cada módulo: las checklists de `dataiq/docs/`,
  `simiq3d/docs/` y `sivri/docs/`.
-->

## Objetivo general

Desarrollar un ecosistema tecnológico basado en inteligencia artificial para
el aprendizaje autónomo de la distribución de instrumental quirúrgico en
estudiantes del programa de Instrumentación Quirúrgica de la Corporación
Universitaria Rafael Núñez.

## Objetivos específicos

1. Diagnosticar las necesidades de práctica y de verificación de la
   distribución de instrumental quirúrgico de los estudiantes del programa de
   Instrumentación Quirúrgica de la CURN, mediante reuniones de trabajo con
   estudiantes del programa y su docente tutora.
2. Especificar el alcance funcional de los módulos del ecosistema a partir de
   la documentación clínica de técnicas quirúrgicas levantada en conjunto con
   el programa de Instrumentación Quirúrgica.
3. Diseñar la arquitectura del ecosistema y el esquema de datos del módulo
   DataIQ, definiendo los mecanismos de interoperabilidad con los módulos SIVRI
   y SIMIQ3D.
4. Desarrollar el módulo DataIQ como plataforma web de gestión del dataset de
   técnicas quirúrgicas, el prototipo funcional del módulo SIVRI basado en la
   arquitectura YOLO26 y el prototipo conversacional del módulo SIMIQ3D para la
   exploración tridimensional de los arreglos de mesa.
5. Evaluar técnicamente los módulos desarrollados mediante métricas de
   desempeño del modelo de detección y de exactitud y tiempo de respuesta del
   asistente conversacional.
6. Diseñar la prueba piloto del ecosistema con estudiantes y docentes del
   programa (población, muestreo, instrumentos y consentimiento informado)
   para valorar su usabilidad, con la Escala de Usabilidad del Sistema (SUS),
   y su pertinencia pedagógica.

## Estrategia por fases

Los objetivos se abordaron en dos fases. En la primera (primer y segundo
corte) se desarrollaron el diagnóstico (objetivo 1), la especificación del
alcance con la matriz de registro de las técnicas (objetivo 2), el diseño de la
arquitectura y del modelo de datos (objetivo 3) y, del objetivo 4, el backend
de DataIQ y los prototipos de las pantallas. En la segunda (tercer corte) se
completó el objetivo 4 con el frontend de DataIQ, el módulo SIMIQ3D y el módulo
SIVRI; se realizó la evaluación técnica (objetivo 5), con las métricas del
detector y la exactitud y el tiempo de respuesta del chat; y se diseñó la
prueba piloto (objetivo 6): su población, su muestreo, sus instrumentos (la
SUS y el cuestionario de pertinencia pedagógica) y el consentimiento
informado (Metodología y Anexo E). La aplicación de la prueba piloto es
posterior a este informe: se hace cuando el programa de Instrumentación
Quirúrgica presente la plataforma a sus estudiantes y docentes.

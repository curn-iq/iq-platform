# Planteamiento del problema

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

- La brecha que atiende el proyecto y a quién afecta.
- La pregunta de investigación.

## Fuentes en el repositorio

- [`README.md`](../../README.md), «Descripción».
-->

La correcta organización del instrumental en las mesas quirúrgicas incide
directamente en la seguridad del paciente y en la eficiencia operatoria; su
verificación manual, propensa a omisiones, es un riesgo clínico persistente que
ha motivado el desarrollo de sistemas de detección automatizada mediante visión
por computador [4]. En la formación de los estudiantes de Instrumentación
Quirúrgica de la CURN, el aprendizaje de la distribución espacial del
instrumental presenta una curva de aprendizaje compleja que, en los entornos de
simulación, demanda supervisión docente constante: su presencia produce mejoras
medibles y su ausencia incrementa el tiempo requerido para alcanzar la
competencia procedimental [5].

Fuera de los laboratorios, la retroalimentación objetiva es limitada. Practicar
sin retroalimentación produce mejoras significativamente menores en la
adquisición de habilidades quirúrgicas, mientras que los sistemas con
retroalimentación automatizada mejoran los resultados de aprendizaje [6], y un
sistema de retroalimentación con inteligencia artificial explicable llegó a
clasificar correctamente el nivel de competencia con una exactitud del 92 %,
sin un evaluador humano [7]. En la CURN, el diagnóstico realizado con tres
estudiantes del programa y su docente tutora, en tres reuniones de trabajo,
confirmó la necesidad: los estudiantes no tienen herramientas para practicar y
verificar la distribución del instrumental fuera del laboratorio, y el
criterio que importa para el programa es la posición de cada instrumento en la
mesa, no su cantidad (Anexo A).

El ecosistema atiende esa brecha en dos lugares. Fuera del laboratorio,
SIMIQ3D permite a quien no tiene una mesa estudiar desde el celular o el
computador cómo se distribuye el instrumental en la mesa de cada técnica.
Dentro del laboratorio, SIVRI acompaña la práctica cuando no hay un docente al
lado: el estudiante arma la mesa real, la enfoca con la cámara del celular y
recibe la indicación de qué falta, qué sobra y qué debe moverse. DataIQ
sostiene a los dos como la fuente única de las técnicas del programa.

De persistir la brecha entre la simulación supervisada y la práctica autónoma
sin retroalimentación, los estudiantes seguirán consolidando patrones de
distribución no verificados, lo que prolonga la curva de aprendizaje y traslada
la corrección a etapas en que el error tiene consecuencias clínicas reales.
Además, depender solo de la supervisión docente limita la escalabilidad del
programa y las oportunidades de práctica deliberada, factor determinante en la
adquisición de habilidades técnicas [6], [8], [1].

**Pregunta de investigación.** ¿Cómo puede un ecosistema tecnológico basado
en inteligencia artificial apoyar el aprendizaje autónomo de la distribución
de instrumental quirúrgico en estudiantes del programa de Instrumentación
Quirúrgica de la Corporación Universitaria Rafael Núñez, y qué desempeño
técnico alcanza?

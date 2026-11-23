# Justificación

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

- Por qué el proyecto es pertinente para el programa de Instrumentación
  Quirúrgica de la CURN y qué aporta.

## Fuentes en el repositorio

- [`README.md`](../../README.md) y [`PRODUCT.md`](../../PRODUCT.md).
-->

El ecosistema responde a tres razones convergentes: la viabilidad técnica
demostrada de los sistemas de inteligencia artificial para la evaluación
quirúrgica, la necesidad educativa concreta de los estudiantes de
Instrumentación Quirúrgica de la CURN y la escasez de herramientas y
repositorios adaptados a programas de formación locales [9].

**Desde lo pedagógico,** la retroalimentación objetiva, inmediata y
reproducible es la variable más determinante en la adquisición de competencias
procedimentales [6], y la práctica deliberada, que la requiere, es la vía para
alcanzar el desempeño experto en medicina [1]. Un sistema de inteligencia
artificial en tiempo real produjo resultados de aprendizaje comparables a la
instrucción presencial de expertos [8], y los sistemas aplicados a la cirugía
digital mejoran las habilidades técnicas y reducen los errores [10]. El
aprendizaje autodirigido, además, mejora la adquisición de conocimientos en
las profesiones de la salud [11].

**Desde lo técnico,** la familia YOLO es la referencia en detección de objetos
en tiempo real en entornos quirúrgicos [4], [12], [13], y YOLO26 extiende esas
capacidades con inferencia más rápida en CPU [2], lo que permite operar en
hardware institucional sin infraestructura especializada. Las plataformas web
de modelado tridimensional han demostrado su viabilidad en equipos de consumo
[14], la simulación virtual mejora los resultados de aprendizaje [15] y existe
evidencia de su uso en la formación en instrumentación quirúrgica [16].

**Desde lo institucional,** la CURN forma profesionales de la salud con
recursos de supervisión limitados. Escobar-Castillejos et al. identifican la
falta de repositorios adaptados al contexto local como la principal barrera
para llevar estos sistemas a programas concretos [9]; DataIQ la atiende con un
dataset propio del programa.

**Desde lo metodológico,** el proyecto deja un procedimiento reproducible:
fotografiar las mesas reales con marcadores fiduciales, dividir los datos por
ronda de captura, construir los modelos 3D sobre las fotos y anclar las
respuestas del chat a una fuente verificable. Otros programas pueden repetirlo
con su propio instrumental.

Los impactos esperados del ecosistema y el indicador con que se observaría
cada uno se resumen en la Tabla I.

**TABLA I. Impactos esperados del ecosistema**

| Impacto | Dimensión | Indicador |
|---|---|---|
| Práctica de la distribución del instrumental fuera del laboratorio | Pedagógica | Uso de SIMIQ3D por los estudiantes (sesiones y preguntas registradas sin la cuenta de quien pregunta) |
| Retroalimentación sin un docente al lado | Pedagógica | Proporción de mesas en que SIVRI da la indicación correcta frente al criterio de un docente |
| Aceptación de la plataforma | Usuario | Puntaje de la Escala de Usabilidad del Sistema (meta de 68 o más [17], [18]) |
| Pertinencia para la formación | Pedagógica | Cuestionario tipo Likert de pertinencia pedagógica aplicado en la prueba piloto |
| Catálogo propio y verificable de las técnicas del programa | Institucional | Técnicas publicadas en DataIQ y proporción de datos con origen en el programa |
| Procedimiento reproducible para otros programas | Académica | Dataset, modelos y código públicos, con su documentación |

*Fuente: elaboración propia.*

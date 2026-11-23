# Marco de referencia

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

## Texto

Solo cambian dos párrafos del texto entregado en el segundo corte; el resto
del marco de referencia se conserva.

**Gamificación en el aprendizaje del instrumental quirúrgico.** Reemplaza la
última oración del párrafo («Este hallazgo fundamenta la incorporación de
mecánicas de puntaje y registro de progreso en el módulo de retroalimentación
del sistema propuesto.»), porque el MVP no tiene puntaje ni registro de
progreso:

> Este hallazgo fundamenta la retroalimentación inmediata del módulo SIVRI:
> al validar la mesa armada, el sistema indica qué instrumento falta, cuál
> sobra y cuál debe moverse, y el porcentaje de instrumentos en su lugar
> respecto de los esperados para la técnica. El puntaje acumulado y el
> registro del progreso de cada estudiante quedan fuera del alcance del MVP.

**Visualización tridimensional interactiva en educación en salud.** Reemplaza
la oración «El módulo SIMIQ3D adopta esta aproximación con una restricción
deliberada: la inteligencia artificial interpreta la intención expresada por
el usuario y compone la escena a partir de modelos tridimensionales
elaborados previamente, sin generar geometría de forma neural.», porque el
chat además redacta la respuesta:

> El módulo SIMIQ3D adopta esta aproximación con una restricción deliberada:
> el modelo de lenguaje interpreta la intención expresada por el usuario y
> redacta la respuesta con los datos que el sistema consulta en DataIQ, y
> cada frase se verifica contra esos datos antes de mostrarse; la escena se
> compone con modelos tridimensionales elaborados previamente, sin generar
> geometría de forma neural.

La oración siguiente del párrafo original («Esta decisión elimina el riesgo de
alucinación morfológica…») se conserva.

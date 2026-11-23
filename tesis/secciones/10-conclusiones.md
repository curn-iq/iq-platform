# Conclusiones

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

- Seis conclusiones, una por objetivo específico, cada una respaldada por un
  resultado (criterio 11). La retroalimentación del segundo corte sugiere esta
  base:
  1. El diagnóstico del proceso de enseñanza y las falencias identificadas.
  2. La especificación del alcance y la estandarización de las técnicas
     quirúrgicas.
  3. El diseño de la arquitectura hexagonal y la base de datos de DataIQ.
  4. El desarrollo e integración de los módulos (DataIQ, SIVRI, SIMIQ3D).
  5. La evaluación técnica (mAP del detector y escala SUS).
  6. El diseño de la prueba piloto con docentes y estudiantes.

## Fuentes en el repositorio

- [`04-objetivos.md`](04-objetivos.md) y [`08-resultados.md`](08-resultados.md).
-->

1. **Diagnóstico.** Las reuniones de trabajo con el programa de
   Instrumentación Quirúrgica, con tres de sus estudiantes y el acompañamiento
   de su docente tutora, mostraron que los estudiantes necesitan practicar y
   verificar la distribución del instrumental fuera del laboratorio y sin un
   docente al lado, y que hoy no tienen cómo hacerlo. De ese diagnóstico salieron los tres módulos del ecosistema y
   el criterio de registrar qué instrumento va en la mesa y dónde, y no
   cuántas veces aparece.
2. **Alcance.** La revisión de los documentos del programa dio una matriz de
   registro de dieciocho técnicas de cinco especialidades, en la que cada dato
   declara su origen (tomado, corregido o propuesto). En el tercer corte, las
   mesas de Mayo de las cinco técnicas de Cirugía General se rehicieron con las
   listas y las fotos del programa (125 fotos en tres rondas y 57 objetos con posición
   medida), lo que reemplazó lo propuesto por datos medidos sobre las fotos del programa, que IQ aún debe validar: de los 478 objetos de las mesas, 325 (68 %) salen de los documentos o las fotos del programa y 153 (32 %) siguen propuestos.
3. **Diseño.** La arquitectura hexagonal y la separación de los módulos, cada
   uno con su base de datos y con DataIQ como fuente única por su API,
   permitieron desarrollar y desplegar SIMIQ3D y SIVRI sin acceder a la base de
   DataIQ. Los identificadores UUIDv7 no se repiten entre instalaciones, y por
   eso los módulos se integran por el nombre del instrumento y no por su
   identificador.
4. **Desarrollo.** Los tres módulos quedaron en funcionamiento: DataIQ como
   plataforma web de gestión del catálogo, SIMIQ3D con el visor de las cinco
   mesas y su chat, y SIVRI con la validación de la mesa desde la cámara del
   celular. Lo que el objetivo del segundo corte planteaba como prototipos de
   SIVRI y SIMIQ3D llegó a ser una versión mínima funcional en producción; el
   backend de SIVRI corre en un equipo del proyecto (el Servidor PC1), no en
   la nube.
5. **Evaluación técnica.** El detector alcanzó en la prueba un mAP@0.5 de 0,887
   y un mAP@0.5:0.95 de 0,614, y el chat respondió correctamente el 91,5 % del
   banco de preguntas (banco con el que también se desarrolló), con la escena
   en 0,19 s y el primer texto en 4,3 s en producción. SIVRI puso la técnica
   correcta en primer lugar en 60 de 64 fotos de las rondas 2 y 3, con celdas
   definidas con fotos de esas mismas rondas, y en las 26 mesas bien armadas evaluables 18 todavía muestran algún aviso, con umbrales por instrumento elegidos con la Ronda 2; su exactitud frente al criterio de
   un docente no se midió.
6. **Diseño de la prueba piloto.** La prueba piloto quedó diseñada: su
   población y su muestreo (Metodología), la sesión guiada, la Escala de
   Usabilidad del Sistema, el cuestionario tipo Likert de pertinencia
   pedagógica y el consentimiento informado (Anexo E). Se aplica después de la entrega, cuando el programa presente la
   plataforma; el número de participantes se registra al aplicarla. Por eso
   este informe no concluye nada sobre la usabilidad ni sobre la pertinencia
   pedagógica.

En conjunto, el trabajo responde la pregunta de investigación. Un ecosistema
basado en inteligencia artificial puede apoyar el aprendizaje autónomo de la
distribución del instrumental en dos momentos: fuera del laboratorio, con la
visualización y la consulta de la mesa de cada técnica en SIMIQ3D, y en el
laboratorio, con la retroalimentación automática de SIVRI sobre la mesa
armada, ambos alimentados por un catálogo verificable en DataIQ. Su
desempeño técnico es el del objetivo 5: un detector con un mAP@0.5 de 0,887 y
un chat que responde bien el 91,5 % del banco de preguntas, con la limitación
de que SIVRI todavía da avisos que no corresponden. Su efecto sobre el
aprendizaje queda por medir con la prueba piloto diseñada.

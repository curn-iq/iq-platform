# Recomendaciones y trabajo futuro

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

- Las recomendaciones que salen de las limitaciones técnicas y de
  infraestructura (criterio 12). La retroalimentación sugiere, por ejemplo: la
  escalabilidad de la base del instrumental, nuevas especialidades
  quirúrgicas, la optimización del detector para dispositivos móviles y más
  funciones del visor 3D.
- El trabajo futuro después del MVP.

## Fuentes en el repositorio

- [`docs/despues-del-mvp.md`](../../docs/despues-del-mvp.md).
- «Limitaciones y riesgos» en [`06-metodologia.md`](06-metodologia.md).
-->

Las recomendaciones se agrupan por destinatario. Por su efecto en la validez
de los resultados, tres van primero: aplicar la Escala de Usabilidad del
Sistema y la prueba piloto con el programa, que responden la parte pedagógica
de la pregunta de investigación; fijar con docentes de IQ la tolerancia de una
«mesa bien armada», sin la cual no puede medirse la exactitud de SIVRI; y
tomar nuevas sesiones de fotos independientes, que son la vía para mejorar el
detector y para medirlo sin sobreestimarlo. Dentro de cada grupo, las
recomendaciones van en ese mismo orden de prioridad.

**Datos y detector.**

- Tomar nuevas sesiones de fotos con el programa, con distinto instrumental,
  luz y ángulo, y con más ejemplos de los pares que el detector confunde (la
  Kocher, la Kelly Adson y la Rochester; los mangos N.° 3 y N.° 4; la Kelly y
  la Mosquito). Es la vía para mejorar el detector: reetiquetar las mismas
  fotos no lo mejoró.
- Registrar, al fotografiar las mesas con errores, qué error se puso en cada
  una, para medir la exhaustividad y la precisión de las indicaciones de SIVRI
  frente al criterio de un docente.
- Medir la mesa de Mayo del laboratorio, para que el visor de SIMIQ3D deje de
  usar un tamaño de mesa provisional, el mismo para las cinco técnicas, y
  mostrar el giro medido de cada instrumento en lugar de alinearlo al eje más
  cercano.
- Llevar el reconocimiento al celular (el modelo exportado para correr en el
  navegador) o a un servidor fijo, para que SIVRI no dependa de un computador
  del equipo.

**Evaluación con usuarios.**

- Definir con el programa la población, la muestra y el consentimiento
  informado, y aplicar la Escala de Usabilidad del Sistema y la prueba piloto.
- Validar el cuestionario de pertinencia pedagógica por juicio de expertos
  con docentes del programa antes de aplicarlo de nuevo.
- Complementar la evaluación con el índice de validez de contenido de los
  modelos 3D, valorado por docentes, y con pruebas de tareas en que el
  estudiante explore una mesa en SIMIQ3D y luego la arme y la valide con SIVRI.
- Evaluar la armada de la mesa en el laboratorio con una evaluación clínica
  objetiva estructurada (ECOE) como la que diseñan Bobadilla Huepo y Avendaño
  Valero para la formación de instrumentadores quirúrgicos [23], con un
  docente que valore cada mesa; sería la referencia para medir la exactitud de
  los avisos de SIVRI.

**Para la comunidad científica.**

- Medir el efecto en el aprendizaje con un diseño cuasiexperimental, como el de
  Acevedo-Osorio et al. [24]: un grupo que practique con SIMIQ3D y SIVRI y otro
  con la práctica tradicional, con el mismo instrumento de evaluación de la mesa
  armada.
- Publicar el dataset, el banco de preguntas y el protocolo de fotos con ArUco
  como referencia reutilizable, con la autorización del programa y de la CURN,
  para que otros equipos comparen detectores y chats sobre los mismos datos.
- Fijar con docentes de IQ la tolerancia de una «mesa bien armada» (qué
  variaciones de posición son aceptables), antes de medir la exactitud de la
  validación automática.

**Alcance del ecosistema.**

- Extender las mesas medidas a otras técnicas y especialidades del catálogo,
  con el mismo procedimiento de fotos y listas del programa.
- Incorporar el puntaje y el registro del progreso del estudiante que sugiere
  la literatura sobre gamificación.
- En SIMIQ3D, un modelo de lenguaje de mayor capacidad, la verificación del
  sentido de cada frase y respuestas revisadas por el programa para las
  preguntas frecuentes.
- En DataIQ, la recuperación de la contraseña por correo y el ingreso con
  cuentas institucionales.

**Para el programa de Instrumentación Quirúrgica.**

- Integrar SIMIQ3D al estudio previo de cada técnica y SIVRI a la práctica
  libre en el laboratorio, con un docente que revise los casos en que SIVRI
  marque algo que el estudiante no entienda.
- Mantener las listas de instrumental y las fotos de las mesas bien armadas
  como referencia oficial de cada técnica, y validar en DataIQ lo que hoy
  figura como «propuesto».
- Registrar, en las prácticas evaluadas, los errores más frecuentes al armar
  la mesa, que servirían para entrenar y evaluar SIVRI con casos reales.

**Para quienes desarrollen sistemas similares.**

- Fotografiar el instrumental real del programa desde el comienzo, en varias
  sesiones y con el error de cada mesa registrado, en lugar de partir de
  catálogos o de modelos genéricos: fue lo que más cambió la calidad de los
  modelos 3D y del detector.
- Planificar sesiones de captura realmente separadas (otro día, otras
  personas, otro celular) y dividir los datos por sesión, no foto por foto ni
  por rondas de una misma visita, para no sobreestimar el desempeño del
  detector [51]: en este trabajo la división fue por rondas de una sola visita.
- Anclar el chat a una fuente de datos verificable y revisar cada frase contra
  ella [32], y medir su exactitud con un banco de preguntas desde las primeras
  versiones.
- Separar la geometría de la mesa (marcadores fiduciales) del reconocimiento
  del instrumental, para que cada parte se pueda corregir por su lado.

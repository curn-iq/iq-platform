# Metodología

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

## Texto

### Desarrollo metodológico por objetivo específico (tabla)

En la tabla de la metodología por objetivo del segundo corte cambian dos filas.
La fila del objetivo 1 citaba la tabla equivocada: el instrumento es la tabla
de acuerdos de las reuniones de diagnóstico (Tabla VII en el segundo corte),
no la Tabla III. La fila del objetivo 5 medía solo el detector y la SUS, y se
agrega la exactitud del chat de SIMIQ3D:

| Objetivo | Técnica | Instrumento | Resultado |
|---|---|---|---|
| 1. Diagnóstico | Reuniones de trabajo | Registro de acuerdos (la tabla de acuerdos de las reuniones de diagnóstico) | Alcance y criterio de registro |
| 5. Evaluación técnica | Medición del detector, banco de preguntas del chat y encuesta | Métricas del detector (precisión, exhaustividad, mAP@0.5 y mAP@0.5:0.95), banco de preguntas de SIMIQ3D y Escala de Usabilidad del Sistema | Desempeño del detector, exactitud del chat y usabilidad |

### Análisis de datos

Se agrega al análisis de datos del segundo corte, después del párrafo del
detector:

> La exactitud del chat de SIMIQ3D se mide con un banco de preguntas
> elaborado por el equipo: cada pregunta trae lo que el chat debe hacer (la
> acción del visor, la técnica y el instrumento) y los puntos que la
> respuesta tiene que decir. Se cuentan las respuestas correctas sobre el
> total y las frases sin respaldo en los datos de DataIQ, y se registra el
> tiempo hasta la escena, hasta el primer texto y hasta la respuesta
> completa. El registro de conversaciones, anónimo, permite repetir la
> medición con las preguntas reales de la prueba piloto.

### Uso de inteligencia artificial

El proyecto usó asistentes de inteligencia artificial como herramientas de
apoyo en el desarrollo, siempre bajo la dirección y la revisión humana de los
autores: cada producto se planteó, se revisó y se corrigió por la persona
responsable antes de integrarse, y ningún resultado se aceptó sin esa
revisión. La Tabla de uso de IA resume en qué trabajo se usó cada asistente.

| Trabajo | Asistente | Papel de la persona responsable |
|---|---|---|
| Backend de DataIQ, SIMIQ3D y SIVRI; infraestructura de despliegue; frontend de SIMIQ3D; documentación del repositorio | Claude Code (Anthropic) | Mauricio Lugo definió cada funcionalidad, revisó el código y las pruebas, y aprobó cada cambio antes de integrarlo |
| Diseño de las pantallas (prototipos) | Claude Code | Mauricio Lugo eligió la dirección visual y aprobó cada pantalla |
| Modelado 3D del instrumental de SIMIQ3D, en Blender, sobre las fotos del programa de Instrumentación Quirúrgica | Claude Code y Codex (OpenAI) | Mauricio Lugo aportó las referencias, comparó cada modelo con las fotos y con las referencias, pidió las correcciones y aprobó uno por uno los 16 modelos |
| Etiquetado y revisión del dataset de SIVRI y entrenamiento del detector YOLO | Claude Code y Codex | Mauricio Lugo revisó las cajas y los casos dudosos y decidió los criterios (por ejemplo, separar las dos pinzas de disección en clases distintas) |

El primer juego de modelos 3D de SIMIQ3D (Guebriel Garces, 2026-10-30) se
modeló a mano en Blender, sin asistentes de IA.

<!-- Juan Caraballo agrega aquí las filas de su trabajo (frontend de DataIQ y shell de navegación). -->

Además, el chat de SIMIQ3D usa un modelo de lenguaje (Qwen3-VL 8B, ejecutado
con Ollama en el Servidor PC2) como parte del producto: interpreta la
pregunta y redacta la respuesta con los datos que consulta en DataIQ, y cada
frase se verifica contra esos datos antes de mostrarse (ver el desarrollo de
SIMIQ3D).

### Limitaciones y riesgos

Reemplaza la última oración del párrafo del segundo corte («Para el módulo
SIMIQ3D quedan dos decisiones abiertas que condicionan su desarrollo: el
origen de la biblioteca de modelos tridimensionales del instrumental y la
tecnología de renderizado.»), porque las dos decisiones ya se tomaron, y
agrega la limitación de la validación de SIVRI:

> Los 16 modelos tridimensionales del instrumental de SIMIQ3D se
> construyeron en Blender sobre las fotos tomadas con el programa de
> Instrumentación Quirúrgica, con scripts y con asistencia de Claude Code y
> Codex, y Mauricio Lugo los aprobó uno por uno; la escena se dibuja en el
> navegador con Three.js (WebGL). El chat de SIMIQ3D redacta sus respuestas
> con un modelo de lenguaje, que puede equivocarse: cada frase se verifica
> contra los datos de DataIQ y la exactitud se mide con el banco de
> preguntas. Las fotos del dataset de SIVRI se tomaron en una sola sesión, y
> en las mesas con errores los errores se
> pusieron al azar sin registrarlos, por lo que la validación de la mesa se
> presenta como diagnóstico técnico y no como medida de exactitud frente a
> errores conocidos.

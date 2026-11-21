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

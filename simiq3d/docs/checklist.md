# Checklist — SIMIQ3D

Avance de SIMIQ3D, ordenado por las actividades de DSRM (la metodología del
proyecto de grado). Se marca cada pieza al terminarla. Las decisiones y su
porqué están en el [README](../README.md).

## 1. Identificación del problema

- [x] El problema del proyecto (reuniones con el programa de IQ, objetivo 1)
  aplica a SIMIQ3D: los estudiantes necesitan estudiar cómo debe quedar la mesa
  de cada técnica antes de practicar su armado

## 2. Objetivos de la solución (alcance)

- [x] Alcance del MVP: la mesa de Mayo de las cinco técnicas de Cirugía General
- [x] Modelos 3D propios, modelados a mano en Blender
- [x] Chat: el modelo elige acciones y los datos salen de DataIQ; modelo
  local con Ollama en el Servidor PC2
- [x] Qué guarda su base: el mapeo modelo 3D → instrumento y el registro
  anónimo de conversaciones
- [x] Cómo se arma la mesa en 3D
- [x] Cómo se evalúa en el MVP
- [x] Backend: Python + FastAPI (confirmado por Guebriel)
- [x] Frontend y visor 3D: Angular + Three.js (decidido por Juan); avance en
  [`checklist-frontend.md`](checklist-frontend.md)
- [ ] (Opcional) Fotos del instrumental de IQ para ajustar los modelos, si hay
  tiempo en la primera visita de SIVRI (ver la
  [checklist de SIVRI](../../sivri/docs/checklist.md))
- [ ] Medir la mesa de Mayo del laboratorio (el área entre los marcadores
  ArUco), en la misma visita
- [ ] Hacia dónde apunta cada instrumento, según las fotos de las mesas bien
  armadas: si es una regla única queda en SIMIQ3D; si cambia por instrumento,
  va en DataIQ
- [ ] La descripción breve de los 23 instrumentos en DataIQ
  (`instruments.description`, hoy vacía), con fuentes citables: es lo que
  muestra SIMIQ3D al hacer clic en un instrumento
- [ ] El registro de conversaciones en la política de tratamiento de datos,
  con su finalidad (evaluación)

## 3. Diseño y desarrollo

- [ ] Banco de preguntas con su acción correcta (ING con ayuda de IQ), antes
  de programar el chat
- [ ] Fotos de catálogo y medidas de cada instrumento, con su fuente
- [ ] Modelos 3D por familias (cinco bases): el `.blend` de cada familia, el
  GLB de cada instrumento y la tabla de medidas, en el repo
- [ ] Visto bueno del programa de IQ a cada modelo (formativo: se corrige y se
  vuelve a pedir)
- [ ] Ollama en el Servidor PC2: que use la GPU (Vulkan o
  `HSA_OVERRIDE_GFX_VERSION=10.3.0`), como servicio y sin suspensión; Tailscale
  Funnel con el filtro con clave
- [ ] Elegir el modelo de lenguaje con el banco de preguntas (punto de
  partida: Qwen3 8B)
- [ ] Backend: API, su base en Neon, validación del JWT de DataIQ, puerto del
  modelo de lenguaje y registro de conversaciones, con pruebas automatizadas
- [ ] Visor 3D: la mesa armada con el arreglo publicado en DataIQ, cada modelo
  en su celda, y clic en un instrumento para ver su descripción
- [ ] Chat en el frontend: pregunta, acción y escena
- [ ] Despliegue: el frontend en el mismo origen que el shell (`/simiq3d/*`),
  el backend detrás de `/api/simiq3d/*`, con GitHub Actions

## 4. Demostración

- [ ] Explorar por chat las cinco mesas de Mayo de Cirugía General, de punta a
  punta

## 5. Evaluación sumativa

- [ ] Exactitud del chat sobre el banco de preguntas y sobre el registro de
  las sesiones; ninguna respuesta inventada
- [ ] Tiempo de respuesta, desde la pregunta hasta la escena
- [ ] Modelos con visto bueno del programa de IQ (de 23)
- [ ] Escala de Usabilidad del Sistema (SUS) y prueba piloto, con el resto del
  ecosistema
- [ ] Borrar el registro de conversaciones al terminar la evaluación

## 6. Comunicación

- [ ] Resultados de SIMIQ3D en el informe (Formato 115)

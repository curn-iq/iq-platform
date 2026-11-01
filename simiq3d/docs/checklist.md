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
- [x] La descripción breve de los 23 instrumentos en DataIQ
  (`instruments.description`), con fuentes citables (columna
  `fuentes_descripcion` de `seed/tecnicas.xlsx`): es lo que muestra SIMIQ3D al
  hacer clic en un instrumento
- [x] El registro de conversaciones en el aviso de privacidad
  ([`docs/privacidad.md`](../../docs/privacidad.md)), con su finalidad
  (evaluación): condición para abrir la plataforma a los estudiantes

## 3. Diseño y desarrollo

- [x] Banco de preguntas con lo que el chat debe hacer con cada una
- [x] Modelos 3D por familias (cinco bases): el `.blend` de cada familia, el
  GLB de cada instrumento y la tabla de medidas, en el repo
- [x] Ollama en el Servidor PC2 con la GPU (RX 6600 XT al 100 %) y como servicio
- [x] Tailscale Funnel con el filtro con clave (solo el filtro queda publicado)
- [x] Servidor PC2 sin suspensión por inactividad
- [x] Modelo de lenguaje del MVP: Qwen3-VL 8B instruct (probados Qwen2.5 7B y
  Qwen3-VL 8B)
- [x] Backend: API, validación del JWT de DataIQ, chat (agente con verificación
  y plantillas de respaldo), mapeo de modelos y registro de conversaciones, con
  pruebas automatizadas; avance en [`checklist-backend.md`](checklist-backend.md)
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
- [ ] Escala de Usabilidad del Sistema (SUS) y prueba piloto en la fase
  preliminar con el programa de IQ (ver el [README](../../README.md)), con el
  resto del ecosistema
- [ ] Al cerrar la evaluación: exportar el registro de conversaciones, borrarlo
  y apagarlo (`CHAT_LOG_ENABLED=false`)

## 6. Comunicación

- [ ] Resultados de SIMIQ3D en el informe (Formato 115)

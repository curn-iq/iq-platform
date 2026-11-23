# Evidencias de las evaluaciones

Resultados exportados que respaldan las cifras de la tesis: tablas de
métricas y los CSV del banco de preguntas del chat, cada uno con la fecha de
la medición en el nombre (`banco-simiq3d-2026-11-21.csv`).

No van aquí datos personales, ni el registro de conversaciones en crudo, ni
las fotos del programa de Instrumentación Quirúrgica (son del dataset de
SIVRI y no se suben al repositorio).

| Archivo | Qué mide | Cómo se obtuvo |
|---|---|---|
| `banco-simiq3d-2026-11-21.csv` | Exactitud del chat de SIMIQ3D: 153 preguntas, con la respuesta, la acción del visor, la calificación y el tiempo de cada una | `chat_bank` con `simiq3d/backend/eval/banco.csv`, el catálogo de producción de DataIQ y el modelo Qwen3-VL 8B en Ollama, en el PC de desarrollo (2026-11-21) |
| `tiempos-simiq3d-2026-11-21.csv` | Tiempo de respuesta del chat en producción: 20 preguntas (4 por técnica), con el tiempo hasta la orden de la escena, hasta el primer texto y hasta la respuesta completa | Peticiones a `POST /chat/stream` de producción con la cuenta de prueba, el modelo en el Servidor PC2 (2026-11-21) |
| `sivri-spatial-2026-11-22.csv` | Cobertura de marcadores, reconocimiento y avisos sobre las cinco mesas | Análisis local de las 70 fotos de Rondas 2 y 3 con YOLO26n y cajas anotadas, con la técnica fijada para contar avisos |
| `sivri-reconocimiento-2026-11-23.csv` | Técnica correcta primera y fotos con dos técnicas, por ronda, técnica y fuente (YOLO o cajas anotadas), antes (22-11) y después (23-11) del cambio de reconocimiento y de celdas | Diagnóstico de las 70 fotos de las rondas 2 y 3 con `sivri-r2` (asistencia de Codex) |
| `sivri-avisos-bien-armada-2026-11-23.csv` | Avisos de mover, faltar y sobrar en las fotos «Bien armada», por ronda, técnica y fuente, antes y después | Mismo diagnóstico, con la técnica del índice de fotos fijada |

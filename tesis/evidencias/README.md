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

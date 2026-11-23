# Figuras de la tesis

Imágenes listas para el Formato 115, en PNG o JPG, con un nombre que diga qué
muestran. Cada figura tiene una fila aquí; su número está en el pie de la
figura, en el texto (lo fija `herramientas/numerar.py`).

Solo van imágenes propias: renders de los modelos, capturas de la plataforma
y recortes de las fotos tomadas con el programa de Instrumentación Quirúrgica,
limitados al instrumental (sin personas). Las imágenes de referencia de
catálogos o de internet no se suben: tienen derechos de autor.

| Archivo | Qué muestra | Sección | Fuente |
|---|---|---|---|
| `dataiq-catalogo.png` | El catálogo de técnicas de DataIQ, por especialidad | Desarrollo de DataIQ | Captura de producción sin cuenta (2026-11-22) |
| `dataiq-tecnica-datos-clinicos.png` | La ficha de una técnica (Tiroidectomía): datos clínicos y fuente | Desarrollo de DataIQ | Captura de producción sin cuenta (2026-11-22) |
| `dataiq-mesa-de-mayo-tiroidectomia.png` | La mesa de Mayo de Tiroidectomía en DataIQ, con su diagrama numerado y su leyenda | Desarrollo de DataIQ | Captura de producción con la cuenta de prueba (2026-11-22) |
| `simiq3d-catalogo-16-modelos.png` | Los 16 modelos 3D finales del instrumental | Desarrollo de SIMIQ3D; Resultados | Render de los GLB de `simiq3d/models/glb/` en Blender (2026-11-21) |
| `simiq3d-modelado-rochester-foto-y-modelo.jpg` | El contorno de la pinza Rochester trazado sobre la foto enderezada, y el modelo resultante | Desarrollo de SIMIQ3D | Foto de IQ IMG_1929 (Tiroidectomía, ronda 1) y render del modelo |
| `simiq3d-posiciones-medidas-tiroidectomia.jpg` | La foto enderezada con los ArUco y la posición medida de cada instrumento | Desarrollo de DataIQ y de SIMIQ3D | Foto de IQ IMG_1929, medición del 2026-11-21 |
| `simiq3d-cinco-mesas-ordenadas.jpg` | Las cinco mesas de Mayo en el visor, vistas desde arriba | Desarrollo de SIMIQ3D; Resultados | Captura del visor (2026-11-21) |
| `simiq3d-sombreado-antes-despues.jpg` | El instrumental sobre el paño antes y después del ajuste de sombreado | Desarrollo de SIMIQ3D | Capturas del visor (2026-11-21) |
| `simiq3d-produccion-tiroidectomia.png` | SIMIQ3D en producción: la mesa de Tiroidectomía con su leyenda | Resultados | Captura de producción con la cuenta de prueba (2026-11-21) |
| `simiq3d-chat-mastectomia.png` | El chat de SIMIQ3D en producción: la pregunta por la mesa de Mastectomía, la respuesta con la ubicación de cada objeto, la escena y la leyenda | Resultados | Captura de producción con la cuenta de prueba, recorrido de las cinco mesas (2026-11-21) |
| `sivri-etiquetas-tiroidectomia.jpg` | Las cajas etiquetadas de una mesa bien armada | Desarrollo de SIVRI | Foto de IQ IMG_1929 y sus etiquetas corregidas |
| `sivri-revision-sam-ronda-1.jpg` | Revisión de las cajas con SAM 2.1: caja vigente y caja propuesta | Desarrollo de SIVRI | Revisión del 2026-11-21 (asistencia de Codex) |
| `sivri-cajas-ampliadas.jpg` | Cajas ampliadas (en verde) donde la anterior (en rojo) cortaba el instrumento | Desarrollo de SIVRI | Corrección del 2026-11-21 (asistencia de Claude Code) |
| `sivri-r2-curves.png` | Pérdidas y métricas por época | Desarrollo de SIVRI | Ultralytics, entrenamiento sivri-r2 del 2026-11-21 |
| `sivri-r2-confusion.png` | Matriz normalizada de las 16 clases en validación | Desarrollo de SIVRI | Ultralytics, corrida sivri-r2 |
| `sivri-spatial-example.png` | Celda del Farabeuf y la Kelly según las anotaciones y YOLO | Desarrollo de SIVRI | IMG_1925, contraste con la semilla de DataIQ del 2026-11-22 |
| `dataiq-diagrama-er.png` | Modelo entidad-relación de DataIQ en el tercer corte | Desarrollo de DataIQ | Copia de `dataiq/docs/diagramabd.png` (dbdiagram.io, 2026-11-21) |
| `dataiq-api-docs.png` | Documentación interactiva de la API de DataIQ, con sus grupos | Resultados (objetivo 4) | Swagger UI con el esquema de `/openapi.json` de producción (2026-11-23) |
| `dataiq-pruebas-backend.png` | Ejecución de las 129 pruebas del backend de DataIQ | Resultados (objetivo 4) | `uv run pytest` en `dataiq/backend` (2026-11-23) |
| `dataiq-prototipo-mesa-de-mayo.png` | Prototipo de la consulta de la mesa de Mayo de una técnica | Resultados (objetivo 4) | `diseno/mockups/tecnica.html`, pestaña «Mesa de Mayo» (captura del 2026-11-23) |
| `dataiq-prototipo-editor.png` | Prototipo del editor, en el paso de la mesa de Mayo | Resultados (objetivo 4) | `diseno/mockups/editor.html`, paso 3 (captura del 2026-11-23) |

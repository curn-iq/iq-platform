# Decisiones de SIVRI

El alcance del MVP, la metodología y el stack, con su porqué.

## Alcance del MVP

- **Qué valida:** la mesa de Mayo de las cinco técnicas de Cirugía General de
  DataIQ (Colecistectomía, Eventrorrafia, Hemicolectomía derecha, Mastectomía y
  Tiroidectomía), de 10 a 13 objetos cada una.
- **Qué reconoce:** los 16 instrumentos de esas mesas
  ([`dataset.md`](dataset.md)). Cada clase del detector es un instrumento del
  catálogo de DataIQ, mapeado por nombre o alias.
- **De dónde salen las imágenes:** un dataset propio, con fotos de las mesas
  reales tomadas con el programa de IQ el 2026-11-18 y divididas por ronda
  completa en entrenamiento, validación y prueba.
- **Cómo reconoce:** en el backend, en CPU, sobre el video en vivo: el celular
  manda 2 o 3 cuadros reducidos por segundo y dibuja el resultado. Así el modelo
  que se evalúa es el mismo que usan los estudiantes, y todos reciben la misma
  calidad sin importar su celular. Conviene usarlo con wifi: con datos móviles,
  una práctica de 30 minutos gasta del orden de 180 MB (estimación sin medir).
- **Qué consume de DataIQ:** el arreglo publicado de cada técnica (objetos,
  mesas con su tamaño y celdas), por su API.

## Metodología

DSRM (Peffers et al.), evaluada con FEDS (Venable et al.):

- **Evaluación formativa:** las métricas de validación de cada entrenamiento y
  las pruebas automatizadas de la lógica que compara la mesa con la de DataIQ.
- **Evaluación sumativa:** mAP@0.5, mAP@0.5:0.95, precisión y exhaustividad
  sobre fotos que el modelo no vio al entrenar; después, la Escala de Usabilidad
  del Sistema (SUS) y la prueba piloto.

## Stack

| Parte | Tecnología | Por qué |
|---|---|---|
| Detector | YOLO26 de Ultralytics | Detección en tiempo real que corre en CPU |
| Ubicar la mesa | OpenCV con marcadores ArUco | Da la mesa exacta en cada cuadro; un encuadre torcido daría errores falsos |
| Emparejar | SciPy (algoritmo húngaro) | Asigna cada detección a su posición esperada |
| Backend | Python 3.14 y FastAPI, con WebSocket | Lo mismo que DataIQ y SIMIQ3D |
| Base | PostgreSQL 18 en el Servidor PC1 | Base propia, aparte de las de DataIQ y SIMIQ3D |
| Sesión | Token corto de DataIQ (5 minutos) en `Authorization: Bearer` | La cookie de sesión no llega al Servidor PC1, que está en otro dominio |
| Frontend | Angular | El mismo framework del shell, DataIQ y SIMIQ3D |

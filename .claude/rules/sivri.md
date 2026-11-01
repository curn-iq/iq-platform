---
paths:
  - "sivri/**"
---

# SIVRI

Qué es, qué valida y cómo: `sivri/README.md`. Dataset y protocolo de fotos:
`sivri/docs/dataset.md`.

- **Licencia AGPL-3.0** (depende de Ultralytics): el código de `sivri/` no va
  en las partes MIT del repo. Puede usar código MIT del repo.
- **Valida por técnica**, no por tiempo quirúrgico (diéresis, hemostasia…):
  eso es trabajo futuro.
- **Alcance del MVP:** la mesa de Mayo de las cinco técnicas de Cirugía
  General; cada clase de YOLO es un instrumento del catálogo de DataIQ,
  mapeado por nombre o alias, nunca por id.
- **Dataset propio:** fotos de las mesas reales tomadas por el programa de IQ
  y etiquetadas por ING, publicadas en Kaggle. Las imágenes no van al repo.
  La división en entrenamiento, validación y prueba es por sesión de fotos,
  nunca foto por foto.
- **Una mesa correcta** es cada instrumento en su celda, medida por el centro
  de su caja, con un margen técnico en los bordes; cuatro marcadores ArUco en
  las esquinas dan la cuadrícula.
- **Autenticación:** el backend corre en el Servidor PC1 (otro dominio), así
  que no recibe la cookie de sesión: valida un token corto de DataIQ en
  `Authorization: Bearer` con la clave pública (JWKS).

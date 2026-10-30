# Checklist — SIVRI

Avance de SIVRI, ordenado por las actividades de DSRM (la metodología del
proyecto de grado). Se marca cada pieza al terminarla.

## 1. Identificación del problema

- [x] El problema del proyecto (reuniones con el programa de IQ, objetivo 1)
  aplica a SIVRI: los estudiantes no pueden verificar la distribución del
  instrumental en mesa fuera del laboratorio

## 2. Objetivos de la solución (alcance)

- [x] Alcance del MVP: la mesa de Mayo de las cinco técnicas de Cirugía General
- [x] Revisión de datasets públicos: ninguno cubre las mesas del MVP
- [x] Dataset propio con fotos del programa de IQ, publicado en Kaggle
- [x] Instrumentos de las cinco mesas ([`dataset.md`](dataset.md))
- [ ] Pedido de fotos al programa de IQ, con fechas acordadas
- [ ] Herramienta de etiquetado y reparto del trabajo
- [ ] Licencia del dataset en Kaggle
- [x] División de los datos: tres sesiones, por sesión
  ([`dataset.md`](dataset.md))
- [x] Protocolo de fotos ([`dataset.md`](dataset.md))
- [x] Dónde corre YOLO: en el backend, sobre 2 o 3 cuadros por segundo del
  video de la cámara (ver el README)
- [ ] Prueba temprana de la demora: YOLO26 de fábrica, la cámara de un celular
  y un backend mínimo; medir cuánto tarda la respuesta desde Colombia
- [x] Licencia de SIVRI: AGPL-3.0 solo en `sivri/` (ver el README)
- [ ] Agregar `sivri/LICENSE` (AGPL-3.0) y la excepción en la sección
  «Licencia» del README raíz
- [x] Qué es una mesa correcta: celda exacta, con margen técnico, y
  marcadores ArUco en las esquinas (ver el README)

## 3. Diseño y desarrollo

- [ ] Etiquetar las fotos de IQ
- [ ] Dividir los datos y publicar el dataset en Kaggle
- [ ] Entrenar YOLO26 (cada iteración con sus métricas de validación:
  evaluación formativa)
- [ ] Lógica de validación (ver «Cómo se valida la mesa» en el README):
  marcadores y cuadrícula, emparejamiento, estados y porcentaje por técnica,
  con pruebas automatizadas
- [ ] Ajustar los umbrales con la sesión de validación
- [ ] Backend de SIVRI (API, su base de datos, validación del JWT de DataIQ,
  y CORS para el origen del shell: la página se sirve allí y manda los cuadros
  al Servidor PC1, que es otro dominio)
- [ ] Autenticación del celular ante SIVRI: la cookie de sesión no llega al
  dominio del Servidor PC1; la página pide a DataIQ un token corto y lo manda en
  `Authorization: Bearer` (depende de la pieza 10 de la checklist de DataIQ)
- [ ] Servidor PC1 para las sesiones: un PC del laboratorio con
  Tailscale Funnel (dirección HTTPS fija, plan gratis); SIVRI pide el catálogo
  a DataIQ una vez por sesión
- [ ] Frontend de SIVRI, servido bajo `/sivri/` en el mismo origen que el
  shell (rewrite del proyecto del shell hacia el de SIVRI). Es el destino de
  «Comprobar con la cámara» en todas las técnicas de DataIQ, así que dice qué
  mesas valida (la de Mayo de las cinco técnicas de Cirugía General)

## 4. Demostración

- [ ] Una mesa de Mayo real de Cirugía General, de punta a punta

## 5. Evaluación sumativa

- [ ] mAP@0.5, mAP@0.5:0.95, precisión y exhaustividad sobre el conjunto de
  prueba (una sesión de fotos de IQ que el modelo no vio)
- [ ] Métricas de la validación de la mesa sobre las mesas con errores de la
  sesión de prueba: exhaustividad y precisión de los errores, y técnicas
  reconocidas
- [ ] Escala de Usabilidad del Sistema (SUS)
- [ ] Prueba piloto con estudiantes y docentes

## 6. Comunicación

- [ ] Resultados de SIVRI en el informe (Formato 115)

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
- [x] Dataset propio con fotos del programa de IQ
- [x] Instrumentos de las cinco mesas ([`dataset.md`](dataset.md))
- [x] Pedido de fotos al programa de IQ, con fechas acordadas (sesión del
  2026-11-18, tres rondas; [`dataset.md`](dataset.md))
- [x] Herramienta de etiquetado y reparto del trabajo (etiquetado
  semiautomático del 2026-11-19 y revisión de cajas con SAM 2.1 del
  2026-11-21; [`dataset.md`](dataset.md))
- [ ] Licencia del dataset en Kaggle
- [x] División de los datos: tres sesiones, por sesión
  ([`dataset.md`](dataset.md))
- [x] Protocolo de fotos ([`dataset.md`](dataset.md))
- [x] Dónde corre YOLO: en el backend, sobre 2 o 3 cuadros por segundo del
  video de la cámara (ver el README)
- [ ] Prueba temprana de la demora: YOLO26 de fábrica, la cámara de un celular
  y un backend mínimo; medir cuánto tarda la respuesta desde Colombia. Medido
  el 2026-11-18: YOLO26n de fábrica a 640 px en la CPU del Servidor PC1 tarda
  unos 24 ms por cuadro (mediana de 10, sin GPU); falta medir la respuesta
  completa desde un celular
- [x] Licencia de SIVRI: AGPL-3.0 solo en `sivri/` (ver el README)
- [x] Agregar `sivri/LICENSE` (AGPL-3.0) y la excepción en la sección
  «Licencia» del README raíz
- [x] Qué es una mesa correcta: celda exacta, con margen técnico, y
  marcadores ArUco en las esquinas (ver el README)

## 3. Diseño y desarrollo

- [x] Etiquetar las fotos de IQ del 2026-11-18
- [x] Dividir el dataset por ronda completa
- [ ] Registrar la publicación verificable del dataset en Kaggle
- [x] Entrenar YOLO26n y registrar las [métricas de validación](dataset.md#resultados-del-detector-yolo26n)
- [x] Lógica de validación (ver «Cómo se valida la mesa» en el README):
  marcadores y cuadrícula, emparejamiento, estados y porcentaje por técnica,
  con pruebas automatizadas (`sivri/backend/app/domain/`, `tests/domain/`)
- [x] Verificar las 16 clases y las 57 posiciones esperadas de la semilla local de DataIQ (ver
  [puntos de partida](validacion.md#puntos-de-partida)).
- [x] Comparar el margen 0,10 y 0,20 en la Ronda 2 y conservar 0,10
  (ver [diagnóstico](diagnosticos.md#diagnóstico-de-la-retroalimentación)).
- [x] Contrastar el detector y las cajas anotadas en las rondas 2 y 3
- [x] Contrastar `sivri-r2` y las cajas anotadas en 70 fotos, con la regla de duplicados y las celdas aprobadas
- [x] Verificar esas celdas y los 16 mapeos en el entorno de PC1 (2026-11-22:
  las 57 celdas del DataIQ local coinciden con la semilla, 16 clases cargadas y
  una foto de Ronda 3 por Funnel, por HTTPS y WebSocket con renovación del token)
- [x] Reconocer la técnica descontando lo que sobra para cada una (2026-11-23: una
  Tiroidectomía bien armada salía empatada con Mastectomía)
- [x] Recalcular las celdas de las cinco mesas con las fotos «Bien armada» de las
  tres rondas (2026-11-23; ver [celdas recalculadas](diagnosticos.md#celdas-recalculadas-con-las-tres-rondas-2026-11-23))
- [x] Publicar las celdas recalculadas en el DataIQ del Servidor PC1 y en producción
  (`seed.update_mayo --apply`, 2026-11-23; los 57 objetos coinciden con el Excel en los dos)
- [x] Umbral de confianza por instrumento (2026-11-23; ver
  [umbral por instrumento](diagnosticos.md#umbral-de-confianza-por-instrumento-2026-11-23))
- [ ] Confirmar con IQ las anotaciones de los errores de Ronda 3 (diferido para después de la entrega)
- [x] Backend de SIVRI (API, su base de datos, validación del JWT de DataIQ,
  y CORS para el origen del shell: la página se sirve allí y manda los cuadros
  al Servidor PC1, que es otro dominio). Hecho el 2026-11-18 en
  `sivri/backend/` ([README](../backend/README.md)): FastAPI, `POST /validate`
  y el video continuo por WebSocket (`/ws/validate`), mapeo clase → instrumento en
  su base, catálogo de DataIQ por HTTPS. El detector real (YOLO26) está
  conectado; el detector de pruebas lo reemplaza hasta que haya pesos entrenados
- [x] Qué se le dice al estudiante de un instrumento por mover, que falta o que
  sobra: la zona de la mesa, lo que tiene al lado y el número del diagrama, sin
  filas ni celdas (`message` en la respuesta; `app/domain/location.py`). Hecho el
  2026-11-18
- [x] Autenticación del celular ante SIVRI: la cookie de sesión no llega al
  dominio del Servidor PC1; la página pide a DataIQ un token corto y lo manda en
  `Authorization: Bearer` (pieza 10 de la checklist de DataIQ)
  - [x] DataIQ: `POST /auth/module-token` entrega el token corto (5 minutos)
  - [x] SIVRI lo valida con el JWKS y lo reenvía a DataIQ para pedir el catálogo
  - [x] El frontend de SIVRI lo pide y lo renueva antes de que venza (`ModuleTokenService` y renovación por la misma conexión; probado desde el celular con el frontend publicado y el backend del Servidor PC1 el 2026-11-23)
- [x] Vista previa HTTPS/WSS en PC1 con un JWT real de DataIQ local (ver
  [README del Servidor PC1](../servidor-pc1/README.md)).
- [x] Habilitar el arranque de la vista previa y sus contenedores en PC1
  con systemd de usuario (ver [README del Servidor PC1](../servidor-pc1/README.md)).
- [x] Verificar una sesión WSS de más de cinco minutos por Funnel público,
  con renovación y rechazo del JWT vencido
- [x] Servidor PC1 para las sesiones del piloto: el PC de escritorio de Mauricio (decidido
  el 2026-11-18) con Tailscale Funnel (dirección HTTPS fija, plan gratis); SIVRI
  pide el catálogo a DataIQ una vez por sesión (ya lo hace). Comprobado el
  2026-11-22 con los servicios de systemd, los pesos de `sivri-r2` y una foto
  enviada desde un celular
- [x] Frontend de SIVRI, servido bajo `/sivri/` en el mismo origen que el
  shell (rewrite del proyecto del shell hacia el de SIVRI). Es el destino de
  «Comprobar con la cámara» en todas las técnicas de DataIQ, así que dice qué
  mesas valida (la de Mayo de las cinco técnicas de Cirugía General). Avance en
  [`checklist-frontend.md`](checklist-frontend.md) (fase 1)

## 4. Demostración

- [x] Probar el analizador con los pesos entrenados y una foto de Ronda 3
- [x] Reproducir fotos de IQ por WebSocket con YOLO26n en localhost y
  registrar el [tiempo de respuesta local](diagnosticos.md#ensayo-local-del-websocket)
- [ ] Una mesa de Mayo real de Cirugía General, de punta a punta

## 5. Evaluación sumativa

- [x] Medir mAP@0.5, mAP@0.5:0.95, precisión y exhaustividad del detector
  una vez sobre la Ronda 3 (ver [resultados](dataset.md#resultados-del-detector-yolo26n))
- [ ] Métricas de la validación de la mesa sobre las mesas con errores de la
  Ronda 3 reservadas del ajuste, con los errores confirmados por IQ:
  exhaustividad y precisión de los errores, y técnicas reconocidas
- [ ] Escala de Usabilidad del Sistema (SUS)
- [ ] Prueba piloto con estudiantes y docentes

## 6. Comunicación

- [x] Resultados de SIVRI en el informe (Formato 115 del tercer corte)

# Tesis: lo que falta para el Corte 3

Ordenado por sección del Formato 115. Las prioridades vienen de la
retroalimentación del Corte 2 (Drive, `RETROALIMENTACION/`), evaluada con la
rúbrica del Formato 40. Cada ítem se marca al terminarlo, en el mismo PR.

## Antes de empezar

- [ ] Pedir al director la rúbrica del Formato 40, para revisar el documento
  criterio por criterio.

## Resumen (prioridad alta, criterio 2)

- [ ] Resumen estructurado de 400 a 500 palabras, en español y en inglés, con
  palabras clave. Se redacta al final, con los resultados reales.

## Planteamiento del problema

- [ ] Redactar el alcance de cada módulo: SIVRI se usa en el laboratorio
  (práctica sin docente al lado) y SIMIQ3D atiende a quien no tiene una mesa;
  hoy el texto dice solo «fuera del laboratorio».

## Objetivos (prioridad alta, criterios 5, 9 y 10)

- [ ] Explicitar la estrategia por fases (por ejemplo, «Fase 1: datos y backend,
  DataIQ»; «Fase 2: visión y 3D, SIVRI y SIMIQ3D») y, en la entrega final,
  mostrar SIVRI y SIMIQ3D funcionando o ajustar los objetivos 4 a 6 a lo
  desarrollado.
- [ ] Objetivo 4: no presentar como terminado lo que no lo estaba en el Corte 2
  (decía «desarrollo completo» de DataIQ con solo el backend y prototipos).
- [ ] Objetivo 5: agregar las métricas de la lógica de validación de SIVRI
  (exhaustividad y precisión de los errores sobre las mesas con errores puestos
  a propósito, y técnicas reconocidas) y la métrica del chat de SIMIQ3D, no solo
  mAP y SUS.

## Marco de referencia

- [x] Gamificación: el párrafo promete «puntaje y registro de progreso», que el
  MVP no tiene; ajustarlo.
- [x] Visualización 3D: decir que el chat, además de interpretar la intención,
  redacta la respuesta con los datos de DataIQ.

## Metodología

- [ ] Población, muestra y tipo de muestreo de la prueba piloto y de la SUS
  (prioridad alta, criterio 7; hoy dice «se definirán»): universo, población
  objetivo con el número de estudiantes y docentes, y tamaño y tipo de muestra.
  La nota del director pide consultarlo con las estudiantes de IQ (qué
  semestre, asignatura o docentes validan).
- [x] Tabla de la metodología por objetivo: dice «Registro de acuerdos
  (Tabla III)» y es la tabla de reuniones del primer corte.
- [x] Tabla de la metodología por objetivo y «Análisis de datos»: agregar la
  métrica de SIMIQ3D (preguntas convertidas en la acción correcta, respuestas
  inventadas, con el registro anónimo de conversaciones).
- [x] «Uso de inteligencia artificial»: declarar el modelo de lenguaje del chat
  de SIMIQ3D como parte del producto, y los asistentes de IA del desarrollo
  (Claude Code y Codex, con revisión humana; decidido por Mauricio el
  2026-11-21). Juan y Gabriel agregan el suyo en la misma tabla.
- [x] «Limitaciones y riesgos»: el origen de los modelos de SIMIQ3D ya está
  decidido (construidos en Blender con scripts y asistentes de IA, sobre las
  fotos del programa de IQ, y aprobados uno por uno por el equipo).
- [ ] Consideraciones éticas: el consentimiento informado de quienes participan
  en la prueba piloto.

## Desarrollo

- [x] Plataforma: reemplazar Cloud Run por la infraestructura real (Vercel para
  DataIQ y SIMIQ3D, Servidor PC1 para SIVRI, Servidor PC2 para el modelo de
  lenguaje), según `docs/arquitectura.md`.
- [x] Seguridad: el token dura dos horas (decía doce) y en el navegador va en
  una cookie `HttpOnly`; justificar la autenticación con OWASP ASVS 5.0 nivel 1
  (límite de intentos).
- [x] DataIQ, «Modelo de datos»: corregir la justificación de UUIDv7 (los ids
  no se repiten entre instalaciones, pero no son iguales en todas; SIVRI y
  SIMIQ3D mapean por nombre).
- [x] DataIQ: el código, la base y la API están en inglés; el frontend en
  Angular; las posiciones medidas de la mesa de Mayo.
- [x] Redactar el desarrollo de SIMIQ3D (no estaba en el Corte 2).
- [x] Redactar el desarrollo de SIVRI (no estaba en el Corte 2).

## Resultados (prioridad media, criterio 9)

- [x] SIMIQ3D: exactitud del chat sobre el banco de preguntas, con el catálogo
  de producción.
- [x] SIMIQ3D: tiempo desde la pregunta hasta ver la escena, en producción (con
  el Servidor PC2).
- [x] SIVRI: precisión, exhaustividad, mAP@0.5 y mAP@0.5:0.95, matriz de
  confusión y curvas de pérdida, del entrenamiento con las etiquetas
  corregidas.
- [x] SIVRI: diagnóstico técnico de la lógica de validación. La evaluación con referencia docente sigue pendiente.
- [ ] SUS (meta de 68 o más) y cuestionario tipo Likert de la prueba piloto.
- [x] Capturas de cada producto en `figuras/` (las de DataIQ, del 2026-11-22).
- [x] SIVRI: figuras del entrenamiento con las etiquetas corregidas (curvas de
  pérdida, matriz de confusión) y un ejemplo de validación de una mesa.
- [x] No repetir lo que la retroalimentación atribuye al documento y este no
  dice: el desarrollo guiado por pruebas (TDD) no está en el Formato 115.
- [x] Verificación: el texto del Corte 2 cuenta «69 pruebas unitarias»; eran
  pruebas de dominio, de acceso a datos y de API (47 de integración con
  PostgreSQL). Contarlas de nuevo y nombrarlas bien.

## Discusión, conclusiones y recomendaciones (entrega final, criterios 10 a 12)

- [ ] Discusión por triangulación (no existía en el Corte 2).
- [ ] Seis conclusiones, una por objetivo.
- [ ] Recomendaciones desde las limitaciones (`docs/despues-del-mvp.md`).

## Anexos

- [x] Anexo C: el enlace al dataset apunta a `dataiq/backend/semilla/`; ahora es
  `dataiq/backend/seed/tecnicas.xlsx`.
- [x] Anexo D: registro de avance del tercer corte.
- [x] Licencia: «MIT, salvo SIVRI bajo AGPL-3.0 por depender de Ultralytics».

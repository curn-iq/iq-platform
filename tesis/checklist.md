# Tesis: lo que falta para el Corte 3

Ordenado por sección del Formato 115. Las prioridades vienen de la
retroalimentación del Corte 2 (Drive, `RETROALIMENTACION/`), evaluada con la
rúbrica del Formato 40. Cada ítem se marca al terminarlo, en el mismo PR.

## Antes de empezar

- [x] Conseguir la rúbrica del Formato 40 y revisar el documento criterio por
  criterio (2026-11-23: autoevaluación con sus 30 subcriterios; se corrigieron
  el Abstract, la metodología, los resultados por objetivo, la discusión, el
  marco conceptual, las referencias, las recomendaciones y las conclusiones).

## Para armar el documento (quien arma la entrega)

- [x] `tesis/` autocontenido (2026-11-23, decidido por Mauricio): el texto de
  cada sección está completo, sin instrucciones de reemplazo sobre el Drive;
  los anexos A y B se copiaron del texto entregado en el segundo corte; las
  referencias (53), las tablas (28) y las figuras (36) están numeradas con
  `herramientas/numerar.py`.

**Decisiones de Mauricio (el equipo no las toma)**
- [ ] Título. La «s» de más («sEcosistema») ya no está en `00-resumen.md`;
  falta decidir si se delimita.
  Propuesta: «Ecosistema tecnológico basado en inteligencia artificial para el
  aprendizaje autónomo de la distribución de instrumental quirúrgico en la mesa
  de Mayo: caso del programa de Instrumentación Quirúrgica de la CURN». Si
  cambia, cambia igual en la portada y en la nota de Vo.Bo.
- [ ] Población y muestra. Si el programa presenta la plataforma en una clase
  (Mauricio ya preguntó a IQ), esa clase es la población y se anota en
  `secciones/06-metodologia.md`. Si solo hay jurados, la SUS y el cuestionario
  quedan como limitación y no se aplican; entonces se cambia la redacción de
  «se aplican después de la entrega» en `04-objetivos.md`, `06-metodologia.md`,
  `08-resultados.md`, `09-discusion.md`, `10-conclusiones.md` y
  `anexos/e-instrumentos.md`.
  Hoy el texto dice que el programa presenta el 2026-11-26, después de la
  entrega, y que por eso la población y la muestra no se cuantifican.
- [x] Aviso de privacidad: `docs/privacidad.md` pasó a la versión 1.1 y ahora
  incluye SIVRI (decidido por Mauricio el 2026-11-23; las cuentas existentes son
  de prueba). Sigue pendiente construir la aceptación nueva del aviso cuando
  cambia la versión (`dataiq/docs/checklist-backend.md`) antes de que se registre
  un usuario real.

**Contenido que falta**
- [ ] SUS: los 10 ítems en español están en `anexos/e-instrumentos.md` (E.1),
  pero vienen de una transcripción de un formulario en línea que cita a
  Sevilla-Gonzalez et al.,
  no del Apéndice multimedia 2 del artículo (el sitio exige verificación de
  navegador). Contrastarlos con el apéndice antes de aplicar la escala.
- [x] Cuestionario de pertinencia (E.2): el juicio de expertos queda para
  después del MVP (decidido por Mauricio el 2026-11-23).
- [x] Participantes del diagnóstico: tres estudiantes de IQ y su docente
  tutora, las mismas en todo el proyecto (confirmado por Mauricio el
  2026-11-23).
- [x] Objetivo 6 reformulado: «Diseñar la prueba piloto…» (aprobado por
  Mauricio el 2026-11-23), en objetivos, metodología, resultados,
  conclusiones y Anexo D.
- [ ] Consentimiento (E.3): si la CURN tiene un formato propio, ese manda.
- [ ] Fila de Juan Caraballo en la tabla de uso de IA de la metodología
  (hay un comentario HTML donde va). Y la de Gabriel Garces, si usó asistentes.

**Para quien arma el documento**
- [x] Las 20 figuras con archivo se ven en GitHub (2026-11-23), incluidas
  las capturas nuevas de la API, de las 129 pruebas, de los dos prototipos y
  el diagrama entidad-relación del tercer corte.
- [ ] Las 16 figuras que faltan (bloques **[Imagen]**): las tres del segundo
  corte (ciclo de aprendizaje, mesa de Mastectomía y modelo entidad-relación
  del primer corte, en el Formato 115 del Drive), las fotos del laboratorio de
  SIVRI, las pantallas de SIVRI y de SIMIQ3D en el celular y en producción,
  Blender, Figma, «Nosotros» y la revisión de versiones.
- [x] Referencias comprobadas el 2026-11-23 con Crossref y las páginas de los
  artículos; los documentos en línea, con su fecha de consulta; se corrigió la
  DOI de Chheang et al. Pendiente solo el equipo con
  que se midieron los 1,12 ms de Frey et al. (la discusión no lo afirma).

## Resumen (prioridad alta, criterio 2)

- [x] Resumen estructurado de 400 a 500 palabras, en español y en inglés, con
  palabras clave. Se redacta al final, con los resultados reales.

## Planteamiento del problema

- [x] Redactar el alcance de cada módulo: SIVRI se usa en el laboratorio
  (práctica sin docente al lado) y SIMIQ3D atiende a quien no tiene una mesa;
  hoy el texto dice solo «fuera del laboratorio».

## Objetivos (prioridad alta, criterios 5, 9 y 10)

- [x] Explicitar la estrategia por fases (por ejemplo, «Fase 1: datos y backend,
  DataIQ»; «Fase 2: visión y 3D, SIVRI y SIMIQ3D») y, en la entrega final,
  mostrar SIVRI y SIMIQ3D funcionando o ajustar los objetivos 4 a 6 a lo
  desarrollado.
- [x] Objetivo 4: no presentar como terminado lo que no lo estaba en el Corte 2
  (decía «desarrollo completo» de DataIQ con solo el backend y prototipos).
- [ ] Objetivo 5 (2026-11-23: se agregó la métrica del chat; las de los errores
  de SIVRI quedan como limitación, porque los errores de la Ronda 3 no se
  registraron): agregar las métricas de la lógica de validación de SIVRI
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
  (2026-11-23: quedan definidos la población y el muestreo por conveniencia;
  el número de participantes se registra al aplicar la SUS, después de la
  entrega)
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
- [x] Consideraciones éticas: el consentimiento informado de quienes participan
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

- [x] Discusión por triangulación (no existía en el Corte 2).
- [x] Seis conclusiones, una por objetivo.
- [x] Recomendaciones desde las limitaciones (`docs/despues-del-mvp.md`).

## Anexos

- [x] Anexo C: el enlace al dataset apunta a `dataiq/backend/semilla/`; ahora es
  `dataiq/backend/seed/tecnicas.xlsx`.
- [x] Anexo D: registro de avance del tercer corte.
- [x] Licencia: «MIT, salvo SIVRI bajo AGPL-3.0 por depender de Ultralytics».

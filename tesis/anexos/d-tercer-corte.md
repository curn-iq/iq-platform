# Anexo D. Registro de avance del tercer corte

<!--
Notas de trabajo (no forman parte del informe).

## Qué lleva

Con el mismo orden del anexo B:

1. **Actividades del corte**, con su producto (tabla).
2. **Cambios respecto al segundo corte**, con su motivo (tabla).
3. **Decisiones técnicas adoptadas**: quién decidió, qué y cuándo (tabla).
4. **Productos del corte.**

## Fuentes en el repositorio

- Qué entró en cada semana: los
  [Releases](https://github.com/curn-iq/iq-platform/releases) `corte-3.*`.
- Las decisiones, con quién y cuándo: los README y `docs/arquitectura.md`
  («decidido por … el AAAA-MM-DD»).
- El avance: las checklists de cada módulo.
-->

## D.1 Actividades del corte

**TABLA XXIV. Actividades del tercer corte**

| Periodo | Actividad | Producto | Responsable |
|---|---|---|---|
| 13–16 oct | Backend de DataIQ en inglés, sesión con cookie, contenedor, CI y despliegue en Vercel | API de DataIQ en producción | Mauricio Lugo, con asistencia de Claude Code |
| 13–15 oct | Planificación del MVP de SIVRI y de SIMIQ3D | `sivri/docs/dataset.md`, `simiq3d/README.md` | Mauricio Lugo |
| 14–16 oct | Arquitectura del frontend de DataIQ y de SIMIQ3D | Documentación del frontend | Juan Caraballo |
| 27 oct–5 nov | Prototipos y diseño de las pantallas de SIMIQ3D | Prototipo en el repositorio (`diseno/mockups/`) | Mauricio Lugo, con asistencia de Claude Code |
| 27 oct–4 nov | Backend del chat de SIMIQ3D, Servidor PC2, registro de conversaciones y banco de preguntas | Chat en producción | Mauricio Lugo, con asistencia de Claude Code |
| 28 oct–4 nov | Frontend de DataIQ y shell de navegación, fases 0 a 7 | DataIQ en producción | Juan Caraballo |
| 29 oct–3 nov | Aviso de privacidad, supresión de cuentas y límite de intentos | Cumplimiento de la Ley 1581 y de OWASP ASVS nivel 1 | Mauricio Lugo, con asistencia de Claude Code |
| 30 oct | Primer juego de modelos 3D: 23 instrumentos modelados a mano en Blender, con medidas del catálogo del CICR | Modelos de SIMIQ3D (5 archivos de Blender y 23 GLB) | Guebriel Garces |
| 2–5 nov | Frontend de SIMIQ3D, rediseño y barra compartida | SIMIQ3D en producción | Mauricio Lugo, con asistencia de Claude Code |
| 18–21 nov | Fotos de las mesas, backend de SIVRI, etiquetado, corrección de las cajas y primer entrenamiento | Dataset y detector de SIVRI | Mauricio Lugo, con asistencia de Claude Code y de Codex |
| 19–21 nov | Mesas de Mayo con las listas y las fotos de IQ, y sus posiciones medidas | Versiones nuevas en DataIQ | Mauricio Lugo, con asistencia de Claude Code y de Codex |
| 20–21 nov | Modelado de los 16 instrumentos sobre las fotos | Modelos 3D y mesas de SIMIQ3D | Mauricio Lugo, con asistencia de Claude Code y de Codex |
| hasta 20 nov | Póster del proyecto, en la plantilla de la universidad (90 × 120 cm) | Póster de la presentación del 2026-11-20 | Guebriel Garces |
| 21 nov | Página «Nosotros» de la plataforma | Frontend de DataIQ | Juan Caraballo |
| 21–22 nov | Recorrido por chat de las cinco mesas en producción y ajustes del chat (respuestas completas de una mesa, negritas, la incisión de Kocher) | SIMIQ3D en producción | Mauricio Lugo, con asistencia de Claude Code |
| 22 nov | Marca de IQ Platform (imagotipo y favicon) en la barra compartida | Shell de DataIQ y SIMIQ3D | Juan Caraballo |
| 22–23 nov | Acabado de acero del instrumental, encuadre en todos los tamaños de pantalla y cámara al tocar una pieza | Visor de SIMIQ3D | Mauricio Lugo, con asistencia de Codex y de Claude Code |
| 22–23 nov | Detector con 16 clases (`sivri-r2`), validación sin avisos por instrumentos repetidos y prueba del backend desde un celular | Backend de SIVRI en el Servidor PC1 | Mauricio Lugo, con asistencia de Codex y de Claude Code |
| 23 nov | Frontend de SIVRI para comprobar la mesa con la cámara del celular, y su despliegue | SIVRI en producción | Juan Caraballo |
| 23 nov | Correcciones tras probar SIVRI con las fotos «Bien armada»: reconocimiento de la técnica, celdas de las cinco mesas desde las tres rondas, umbral de confianza por instrumento y revisión de las etiquetas de la Kelly con un reentrenamiento de prueba | Backend de SIVRI, mesas de DataIQ y dataset | Mauricio Lugo, con asistencia de Claude Code y de Codex |
| 22–23 nov | Correcciones del Formato 115 señaladas en la retroalimentación del segundo corte y resultados del tercer corte | `tesis/` | Mauricio Lugo, con asistencia de Claude Code |
| 23 nov | Instrumentos de la evaluación con usuarios (SUS, cuestionario de pertinencia y consentimiento) y aviso de privacidad 1.1 | `tesis/anexos/e-instrumentos.md`, `docs/privacidad.md` | Mauricio Lugo, con asistencia de Claude Code |

*Fuente: elaboración propia.*

El detalle de cada cambio está en los PR del repositorio y en los releases
`corte-3.*`.

## D.2 Cambios respecto al segundo corte

**TABLA XXV. Cambios respecto al segundo corte**

| Antes | Ahora | Motivo |
|---|---|---|
| Despliegue previsto en Cloud Run | Vercel, Neon, Servidor PC1 y Servidor PC2 | Google Cloud exigió un pago anticipado y el equipo no cuenta con tarjeta de crédito |
| Token de doce horas | Token de dos horas, en una cookie `HttpOnly` | Seguridad de la sesión en el navegador |
| Código y base en español | Código, base y API en inglés; interfaz y documentación en español | Convención del equipo (2026-10-13) |
| Frontend por definir | Angular, para DataIQ y SIMIQ3D | Decisión del equipo (2026-10-11) |
| Modelos 3D desde referencias de catálogo | Modelos 3D sobre las fotos de las mesas de IQ | Observación de la tutora de IQ (2026-11-05) |
| Chat con consultas y plantillas | Chat tutor que redacta con los datos de DataIQ y se verifica frase por frase | Las pruebas mostraron un chat demasiado limitado |
| Mesas de Mayo de los documentos de IQ | Mesas con las listas nuevas de IQ, las fotos y la posición medida de cada instrumento | Las listas y fotos de la visita del 2026-11-18 |
| Repositorio bajo licencia MIT | MIT, salvo SIVRI bajo AGPL-3.0 | SIVRI depende de Ultralytics |

*Fuente: elaboración propia.*

## D.3 Decisiones técnicas adoptadas

**TABLA XXVI. Decisiones técnicas del tercer corte**

| Fecha | Decisión | Quién |
|---|---|---|
| 2026-10-13 | Nombres en inglés en el código; documentación e interfaz en español | El equipo |
| 2026-10-13 | Alcance del MVP de SIVRI: la mesa de Mayo de las cinco técnicas de Cirugía General, con dataset propio | Mauricio Lugo |
| 2026-10-14 | Infraestructura gratuita y sin tarjeta de crédito | El equipo |
| 2026-10-15 | Mismo alcance para SIMIQ3D; modelos 3D propios en Blender | Mauricio Lugo |
| 2026-10-30 | El MVP es una fase preliminar, evaluada con el programa de IQ | Mauricio Lugo |
| 2026-11-01 | La autenticación se justifica con OWASP ASVS 5.0, nivel 1 | Mauricio Lugo |
| 2026-11-04 | El chat de SIMIQ3D pasa a ser un tutor que redacta con los datos de DataIQ | Mauricio Lugo |
| 2026-11-18 | El backend de SIVRI corre en el Servidor PC1 | Mauricio Lugo |
| 2026-11-20 | DataIQ guarda la posición y el giro medidos de cada instrumento | Mauricio Lugo |
| 2026-11-21 | Cada instrumento de la mesa es su propio objeto de la leyenda | Mauricio Lugo |
| 2026-11-21 | Las pinzas de disección con y sin garra son dos clases del detector | Mauricio Lugo |
| 2026-11-21 | Lo que va a la tesis se prepara en el repositorio (`tesis/`) | Mauricio Lugo |
| 2026-11-21 | En una mesa importa qué instrumento está y dónde, no cuántas veces aparece | Mauricio Lugo |
| 2026-11-22 | La validación de las mesas con errores se presenta como diagnóstico técnico, sin consultar a IQ los errores de la Ronda 3 en esta entrega | Mauricio Lugo |
| 2026-11-23 | El frontend de SIVRI se despliega en un proyecto de Vercel propio, en la cuenta de Juan Caraballo | Juan Caraballo |
| 2026-11-23 | SIVRI valida con el DataIQ de producción, donde se inicia la sesión | Mauricio Lugo |
| 2026-11-23 | Las celdas de las cinco mesas se toman de las fotos «Bien armada» de las tres rondas | Mauricio Lugo |
| 2026-11-23 | El reconocimiento de la técnica descuenta los instrumentos que sobran para ella | Mauricio Lugo |
| 2026-11-23 | Umbral de confianza propio para los instrumentos que el detector ve con poca confianza | Mauricio Lugo |
| 2026-11-23 | Se mantiene el detector `sivri-r2`: el reentrenamiento con las etiquetas de la Kelly revisadas no lo mejoró | Mauricio Lugo |
| 2026-11-23 | La Escala de Usabilidad del Sistema y la prueba piloto se aplican después de la entrega del informe, cuando el programa presente la plataforma | Mauricio Lugo |
| 2026-11-23 | Se precisan la pregunta de investigación (cómo puede el ecosistema apoyar el aprendizaje autónomo y qué desempeño técnico alcanza) y los objetivos 1, 5 y 6: el 1 diagnostica las necesidades de práctica y de verificación; la SUS pasa del objetivo 5 al 6, y el 6 pasa de implementar la prueba piloto a diseñarla, porque su aplicación es posterior a la entrega del informe | Mauricio Lugo |
| 2026-11-23 | El título se delimita a las mesas de Mayo y de reserva, las que registra DataIQ | Mauricio Lugo |
| 2026-11-23 | El aviso de privacidad pasa a la versión 1.1, con SIVRI y el contexto del chat, sin construir antes la aceptación nueva del aviso porque las cuentas existentes son de prueba | Mauricio Lugo |

*Fuente: elaboración propia.*

## D.4 Reuniones

**TABLA XXVII. Reuniones del tercer corte**

| Fecha | Con quién | Tema y resultado |
|---|---|---|
| 2026-10-16 | Estudiantes de Instrumentación Quirúrgica | Presentación de los prototipos de las pantallas, que les gustaron |
| 2026-11-05 | Estudiantes de Instrumentación Quirúrgica y su tutora (virtual) | Presentación de la plataforma; la tutora observó que el instrumental de los modelos no era del todo correcto y que el proyecto iba bien encaminado |
| 2026-11-18 | Estudiantes de Instrumentación Quirúrgica, en el laboratorio | Fotos de las mesas de Mayo de las cinco técnicas y del instrumental (la visita del 2026-11-17 se aplazó un día) |
| 2026-11-20 | Presentación del proyecto | Póster (Guebriel Garces) y vista previa de la plataforma |

*Fuente: elaboración propia.*

## D.5 Cambios pedidos por el programa de Instrumentación Quirúrgica

**TABLA XXVIII. Cambios pedidos por el programa de Instrumentación Quirúrgica**

| Fecha | Qué pidió u observó el programa | Qué se hizo |
|---|---|---|
| 2026-10-16 | Les gustaron los prototipos de las pantallas | Se mantuvo su dirección en el frontend |
| 2026-11-05 | El instrumental de los modelos 3D no era del todo correcto | Visita al laboratorio el 2026-11-18, fotos de las cinco mesas y los 16 modelos rehechos sobre ellas |
| 2026-11-19 y 2026-11-20 | Listas nuevas del instrumental de las cinco técnicas de Cirugía General, y la de Tiroidectomía completada con el mango N.° 4 y las dos pinzas de disección | Mesas de Mayo de DataIQ, modelos de SIMIQ3D y clases de SIVRI actualizados con esas listas |
| 2026-11-20 | Una interfaz llamativa, con lila y más vida | SIMIQ3D cambió el color de acento a lila, el fondo y el encabezado del chat, conservando la disposición y las formas |

*Fuente: elaboración propia.*

## D.6 Dificultades y cómo se resolvieron

- **Infraestructura sin tarjeta de crédito.** Google Cloud exigió un pago
  anticipado desde Colombia. Se migró a servicios gratuitos (Vercel y Neon) y a
  dos equipos propios publicados con Tailscale Funnel.
- **Datos de las fuentes que no cuadraban.** Algunos datos de los documentos de
  las técnicas no se podían cargar tal cual (números de la leyenda que no
  coincidían, mesas sin nombre). Se registraron en la checklist del backend de
  DataIQ y se cargó solo lo verificable.
- **Un chat demasiado limitado.** El primer diseño respondía con plantillas y no
  conversaba. Se rediseñó como tutor, con una revisión frase por frase que
  impide inventar datos clínicos. El modelo de lenguaje en el Servidor PC2
  tarda varios segundos por respuesta; se mostró la respuesta a medida que se
  escribe.
- **Instrumental de los modelos 3D no del todo correcto.** Los primeros modelos
  salían de referencias de catálogo. Se fotografiaron las mesas reales y se
  rehicieron los 16 modelos sobre esas fotos.
- **Modelado sobre fotos reales.** La cinta amarilla con que IQ marca el
  instrumental deformaba los contornos, varias pinzas aparecían superpuestas y
  una foto cenital no muestra el espesor ni la dirección de las curvas. Se
  reconstruyó por simetría lo que tapaba la cinta, se tomaron los detalles de
  referencias del instrumental y se registró como inferido lo que la foto no
  mide.
- **Etiquetas del dataset.** Los mangos N.° 3 y N.° 4 estaban intercambiados y
  algunas cajas no cubrían el instrumento entero; se corrigieron con un modelo
  de segmentación y revisión humana, y el detector se entrenó de nuevo
  (`sivri-r2`).
- **Avisos de mover en mesas bien armadas.** Al probar el frontend de SIVRI con
  las fotos «Bien armada», el sistema pedía mover piezas bien puestas: las
  celdas salían de una sola foto por técnica y el programa de IQ no armó la mesa
  igual en cada ronda. Se recalcularon con las fotos de las tres rondas. Una
  Tiroidectomía bien armada salía empatada con Mastectomía porque el parecido
  no descontaba los instrumentos que sobraban; se corrigió el cálculo.
- **Piezas que el detector veía con poca confianza.** Casi la mitad de los
  faltantes eran pinzas de disección que el modelo sí veía, por debajo del
  umbral de 0,35. Se fijó un umbral propio por instrumento, elegido en la
  Ronda 2. Reetiquetar la Kelly y entrenar de nuevo no mejoró el detector, que
  sigue confundiendo la Kocher y la Kelly Adson con la Rochester y los dos
  mangos entre sí: eso pide más fotos.
- **Modelos viejos en el navegador.** Tras publicar los modelos nuevos, los
  navegadores seguían mostrando los anteriores, guardados en caché. Cada modelo
  se publica ahora con una huella de su contenido en el nombre.
- **Cupos de uso de los asistentes de IA.** Los asistentes tienen límites de uso
  por periodo; el trabajo se traspasó entre Claude Code y Codex con documentos
  de contexto en cada traspaso, sin perder las decisiones tomadas.

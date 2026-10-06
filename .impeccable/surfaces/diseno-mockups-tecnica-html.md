---
version: 1
slug: "diseno-mockups-tecnica-html"
primary_target: "diseno/mockups/tecnica.html"
related_targets: []
---

# Detalle de técnica

## Alcance y modo

Página de una técnica vista con sesión iniciada. El mockup trae las cinco técnicas de Cirugía general, navegables desde la columna de técnicas (la técnica va en el hash): Mastectomía, Tiroidectomía, Colecistectomía y Eventrorrafia con datos reales; Hemicolectomía derecha como plantilla marcada «demostración». Modo **Operate/Read**: el estudiante repasa dónde va cada objeto en la mesa de Mayo y en la de reserva, y qué instrumental lleva. Mesas de la base de DataIQ; las que faltan se muestran como «Sin mesa de …» y un número que la fuente no deja leer queda como hueco «Sin dato» en la leyenda. Datos clínicos de la ficha de IQ (anestesia, posición, ropa, suturas por plano, equipos biomédicos, equipo médico-quirúrgico e instrumental); IQ no documentó «para qué sirve», así que ese bloque lleva un texto de muestra marcado «demostración», sin afirmaciones clínicas (decisión del usuario). Sin hablar de fuentes ni procesos internos. El mockup es visual: los botones (SIMIQ3D, SIVRI, cuenta) se ven pero no funcionan. El usuario pidió construirla sin ronda de decisión («de una vez»): se tomó la estructura que el sorteo puso primera.

## Direction contract

THESIS: la técnica dentro de su herramienta, como la ventana de DataIQ del inicio: técnicas a la izquierda y la técnica con pestañas a la derecha, sin scroll largo; rechaza el documento que obliga a bajar para llegar a la mesa.

OWN-WORLD: el de DESIGN.md: `fondo` en el panel y `superficie` en la columna de técnicas, tinta petróleo, verde de marca en selección y acciones, filetes de 1 px; aquí la mesa es un diagrama sereno (superficie con filete, rejilla fina, instrumental en acero, objetos planos con contorno, sin paño ni tela) por pedido del usuario; Host Grotesk; «demostración» en Martian Mono para lo ilustrativo.

STORY: el estudiante ve para qué sirve la técnica y cómo se prepara (anestesia, posición, ropa, equipos, suturas por plano), revisa su instrumental y recorre cada mesa señalando la leyenda; cambia de técnica desde la columna izquierda.

FIRST VIEWPORT: barra con sesión iniciada; columna de técnicas (buscador y técnicas por especialidad, la actual marcada) de 300 px; panel con «Tiroidectomía», su especialidad y «Ver en 3D» / «Comprobar con la cámara»; pestañas Datos clínicos, Instrumental, Mesa de Mayo, Mesa de reserva; cada hoja cabe en 1440 × 900.

FORM: pedido por el usuario («me gusta esta idea que se mostraba en el inicio»), reemplaza al documento con índice lateral (seed 043a8582). Movimiento firma: raya que se desliza bajo la pestaña elegida y leyenda enlazada con su mesa.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas

- Cómo se muestran descripción, indicaciones, complicaciones y técnica quirúrgica cuando haya fuente.
- Dibujos propios para Babcock, Foerster, Moninjan y valva maleable (hoy reutilizan el más parecido).

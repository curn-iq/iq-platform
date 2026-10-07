---
version: 1
slug: "diseno-mockups-revision-html"
primary_target: "diseno/mockups/revision.html"
related_targets: []
---

# Versiones por revisar

## Alcance y modo

Pantalla del rol `revisor` (y `admin`), modo **Operate**. Se llega desde «Mi cuenta» → «Por revisar». Dos vistas en la misma página: la lista de pendientes y la revisión de una versión. Lista: cada versión en revisión con su técnica, autor, fecha de envío y espera, si es técnica nueva o edición de una publicada, qué secciones cambian y la nota del autor; un revisor no necesita que nadie revise lo suyo: lo publica directo desde el editor, así que sus versiones no aparecen aquí (decisión del 2026-10-06); pestaña «Revisadas por mí» con el historial. Revisión (decisión del usuario: combinación de cambios marcados y lado a lado; comentarios por sección): publicada y propuesta lado a lado, sección por sección, con lo cambiado marcado; comentarios en cada sección y en cada celda de la mesa; «Aprobar y publicar» o «Devolver con comentarios», que junta los comentarios y suma una nota general. La demostración es la versión 2 de Tiroidectomía enviada por Daniela Ortiz (la misma que Mis borradores muestra en revisión): la versión publicada usa los datos reales; los cambios propuestos (texto clínico y una pieza movida) son de demostración y van marcados. Usuaria revisora de demostración: Laura Pérez.

## Direction contract

THESIS: la revisión abre en la mesa, el objeto que más importa acertar: la publicada y la propuesta lado a lado, con cada pieza movida, nueva o quitada señalada en su celda; las demás secciones esperan en pestañas con su cifra de cambios. Rechaza el formulario de aprobación con un diff de texto.

OWN-WORLD: el de DESIGN.md y el detalle: `fondo`, tarjetas `superficie` con anillo de 1 px y radio 16, la mesa serena del detalle (rejilla `filete`, acero, números en círculo), pestañas con raya de 2 px en `tinta`, cifras tabulares; cambios marcados en `marca` (lo nuevo o movido) y con contorno punteado `filete-2` (donde estaba), nunca en rojo; pastillas de estado de Mis borradores.

STORY: el revisor ve qué espera revisión y desde cuándo, abre una versión, entiende de un vistazo qué cambió en la mesa y en cada sección, comenta donde haga falta y la aprueba o la devuelve con sus comentarios en su sitio.

FIRST VIEWPORT (revisión): barra con «Mi cuenta» (revisora); ruta «‹ Por revisar»; nombre a 40 px con «demostración», «Versión 2 · edición de la publicada · enviada por Daniela Ortiz el 1 oct», la nota del autor; a la derecha «Devolver con comentarios» y «Aprobar y publicar»; pestañas Datos clínicos (cifra), Instrumental, Mesa de Mayo (cifra, abierta), Mesa de reserva; debajo las dos mesas lado a lado con su título («Publicada · v1», «Propuesta · v2») y la lista de cambios con sus comentarios.

FORM: «La mesa manda», posición 6 de la lista ordenada; seed 414d9a62. Movimiento firma: al señalar un cambio, la pieza se levanta en las dos mesas a la vez y una línea une dónde estaba y dónde quedó.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas

- El esquema no guarda comentarios de revisión ni por sección ni por celda (ver la nota de Mis borradores sobre el rechazo); habrá que modelarlos en el backend de escritura.
- Archivar técnicas publicadas (también del revisor) queda fuera de esta pantalla.

---
version: 1
slug: "diseno-mockups-instrumental-html"
primary_target: "diseno/mockups/instrumental.html"
related_targets: []
---

# Catálogo de instrumental

## Alcance y modo

Herramienta de consulta y mantenimiento del catálogo de instrumental de DataIQ, para el rol `revisor` (y `admin`). Modo **Operate**. Se llega desde «Mi cuenta» → «Instrumental». Pedido del usuario: una herramienta profesional de consulta para Instrumentación Quirúrgica, no galería, tarjetas, CRUD ni e-commerce; prioridad: encontrar rápido un instrumento, entender su categoría, consultar sus datos y saber en qué técnicas se usa; la edición integrada sin dominar. Mantener el catálogo (corregir nombre, categoría, descripción, alias; crear; nunca borrar) y, antes de guardar, mostrar en qué técnicas publicadas se verá el cambio. Datos reales de la base: 143 instrumentos canónicos en 14 categorías, sus alias (57 tienen), y 246 ubicaciones en 21 mesas (90 instrumentos); ninguno tiene descripción todavía, y eso se muestra tal cual. Revisora de demostración: Laura Pérez.

## Direction contract

THESIS: un instrumento se entiende por dónde va. Su entrada lo explica con su uso: cada técnica en que aparece, con una mesa en miniatura y su celda encendida y numerada. Rechaza la ficha de producto con foto y la tabla de administración.

OWN-WORLD: el de DESIGN.md y el detalle: `fondo`, la columna lateral `superficie` de 300 px del detalle como índice por categoría con cifras, la entrada en `fondo` con nombre a 40 px y ruta de categoría, chips `marca-claro` para alias, mesas en miniatura como rejilla `filete` sobre `superficie` con la celda encendida en `marca` y su número en círculo; el acero dibujado solo cuando la pieza tiene dibujo propio; Host Grotesk, cifras tabulares.

STORY: el profesional busca por nombre o alias, ve la categoría y la ruta, lee la descripción y entiende la pieza por las mesas donde va; si es revisor, corrige o completa la entrada en su lugar, sabiendo en cuántas técnicas publicadas se verá el cambio.

FIRST VIEWPORT: barra con «Mi cuenta» (revisora); a la izquierda la columna con buscador, «Nuevo instrumento» e índice por categoría con cifras; al centro la entrada elegida: ruta «Instrumental › Pinza», nombre a 40 px, «En 9 técnicas · 9 mesas», «Editar esta entrada» discreto; descripción (o «Sin descripción todavía» con «Escribir descripción»); «También se escribe así» con los alias; «Dónde va», la rejilla de mesas en miniatura agrupadas por especialidad.

FORM: «Dónde va, mesa por mesa», posición 6 de la lista de la segunda repetición; seed ff765cea (reroll 2). Movimiento firma: al cambiar de instrumento, las celdas de las mesas en miniatura se encienden una tras otra.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas

- Ningún instrumento tiene descripción (`Instrumental.descripcion`); se llena con fuentes citables (CLAUDE.md). Decisión del usuario (2026-10-06): las descripciones se escriben después, no en el Corte 2; la pantalla muestra el vacío tal cual.
- Los usos son solo los de las mesas cargadas: los listados de instrumental de las técnicas aún no están en la base, así que un instrumento puede usarse en una técnica sin aparecer aquí.

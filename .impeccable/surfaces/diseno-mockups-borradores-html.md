---
version: 1
slug: "diseno-mockups-borradores-html"
primary_target: "diseno/mockups/borradores.html"
related_targets: ["diseno/mockups/tecnica.html"]
---

# Mis borradores

## Alcance y modo

Primera pantalla de la gestión de DataIQ, para el rol `colaborador` (y los roles que lo incluyen). Modo **Operate**. Se llega desde el menú «Mi cuenta» del shell, que con esta pantalla queda definido: nombre, correo y rol, los accesos de gestión que el rol permite y «Cerrar sesión» (pedido del usuario: la gestión entra por ese menú, la barra no cambia). Lista las versiones en curso del colaborador: borradores, devueltas por el revisor y en revisión. Acciones: «Nueva técnica» y «Editar una publicada»; editar una publicada también se arranca desde el detalle de la técnica (pedido del usuario: desde ambos). Cada fila muestra estado, fecha de la última edición, el avance por sección (datos clínicos, instrumental, mesa de Mayo, mesa de reserva) y, si fue devuelta, el comentario de la revisión. Las filas son de demostración sobre técnicas reales, con el avance que el dataset tiene hoy (ninguna técnica tiene datos clínicos).

## Direction contract

THESIS: el trabajo pendiente se lee como una matriz de avance: cada técnica es una fila y cada sección una columna con su marca, así se ve de un vistazo qué falta y dónde seguir. Rechaza la lista de tarjetas con un porcentaje por técnica.

OWN-WORLD: el de DESIGN.md: `fondo` con la tabla en `superficie` y filete, filas reguladas por filetes de 1 px, encabezados de columna en 13 px `tinta-3`, marcas de sección dibujadas (completa en `marca`, en curso a medias, pendiente vacía en `filete-2`, sin mesa con raya), estado en pastilla (devuelta en `tinta`, nunca rojo), Host Grotesk, cifras tabulares.

STORY: el colaborador entra desde «Mi cuenta», ve primero lo que le devolvieron y por qué, reconoce en cada fila qué sección le falta y sigue escribiendo, o empieza una técnica nueva o la nueva versión de una publicada.

FIRST VIEWPORT: barra con «Mi cuenta» abierto en la captura del menú; título «Mis borradores» a 40 px con la línea de conteo, y a la derecha «Nueva técnica» (botón principal) y «Editar una publicada»; debajo, filtros Todas / Devueltas / Borradores / En revisión; la tabla a todo el ancho del contenido con Técnica (nombre, especialidad, versión), Estado, Editada y las cuatro columnas de sección, más la acción de la fila. La fila devuelta se abre con el comentario de la revisión.

FORM: «Matriz de avance», posición 4 de la lista ordenada; seed 1ec3cc68. Movimiento firma: la fila devuelta despliega su comentario y las marcas de sección se trazan al cargar, una columna tras otra.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas

- El editor de técnica (siguiente pantalla) es el destino de «Continuar», «Nueva técnica» y «Editar una publicada».
- «Devuelta» y el comentario de la revisión no existen en el esquema: al rechazar, la versión vuelve a `borrador`, sin campo para el motivo, y el CHECK `revision_coherente` impide guardar quién la revisó mientras esté en borrador. Habrá que modelar el rechazo (p. ej. una tabla de revisiones) en el backend de escritura. En el mockup, «Devuelta» es un borrador con comentario de revisión.

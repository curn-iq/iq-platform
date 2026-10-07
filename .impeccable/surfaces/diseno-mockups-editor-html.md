---
version: 1
slug: "diseno-mockups-editor-html"
primary_target: "diseno/mockups/editor.html"
related_targets: []
---

# Editor de técnica

## Alcance y modo

Donde el colaborador escribe una versión en borrador; un revisor o admin usa el mismo editor y publica lo suyo directo (variante `?como=revisor` / `?como=admin`). Modo **Operate**. Se llega desde «Continuar», «Nueva técnica» y «Editar una publicada» en Mis borradores, y desde «Editar técnica» / «Continuar borrador» en el detalle. La demostración es la versión 2 de Colecistectomía, en borrador, con los datos reales que el detalle ya muestra: anestesia, ropa, posición, equipos, suturas, equipo médico-quirúrgico, instrumental y la mesa de Mayo de 7 × 6 con sus diez objetos; no tiene mesa de reserva. Decisiones del usuario: la mesa se arma arrastrando un objeto a su celda o tocando la celda y eligiendo el objeto (las dos vías hacen lo mismo); autoguardado, sin botón Guardar; «Enviar a revisión» queda bloqueado hasta que todas las secciones estén completas. Una mesa que la técnica no lleva se declara con «Esta técnica no lleva mesa de reserva» y cuenta como completa. Los campos clínicos sin dato quedan vacíos para escribir: el mockup no inventa contenido clínico.

## Direction contract

THESIS: escribir una técnica es un recorrido en orden, como se arma en el quirófano: datos clínicos, instrumental, mesa de Mayo, mesa de reserva y, al final, revisar y enviar. Un paso por pantalla, cada uno con su marca de avance. Rechaza el formulario único y larguísimo con un botón Guardar al pie.

OWN-WORLD: el de DESIGN.md y el de Mis borradores: `fondo`, hojas en `superficie` con filete, las mismas marcas de avance de 22 px (completa, en curso, pendiente), la mesa serena del detalle (rejilla `filete`, instrumental en acero, números en círculo) con una capa de celdas encima para soltar y tocar; botones `boton` y `boton suave`, Host Grotesk, cifras tabulares.

STORY: el colaborador ve en qué paso va y qué le falta, completa cada paso con lo que la fuente trae, ubica cada objeto en su celda y, cuando todo está completo, envía la versión a revisión sin preocuparse por guardar. Si es revisor o admin, en el último paso la publica directamente tras confirmar.

FIRST VIEWPORT: barra con «Mi cuenta»; la ruta «Mis borradores ›», el nombre de la técnica a 40 px con «Cirugía general · Versión 2 · Borrador» y, a la derecha, el estado del guardado y «Ver la versión publicada»; la fila de los cinco pasos con su número o marca, su nombre y lo que falta; el paso abierto (en la mesa: la lista de objetos con su número a la izquierda y la cuadrícula a la derecha); una barra fija abajo con Anterior y «Siguiente: …».

FORM: «Asistente por pasos», posición 5 de la lista ordenada; seed f3abcb55. Movimiento firma: al soltar un objeto en su celda la pieza se asienta (cae y se acomoda) y la marca del paso se traza; el guardado pasa de «Guardando…» a «Guardado» en cada cambio.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas

- Qué campos clínicos son obligatorios para «completa»: el mockup pide Para qué sirve, Indicaciones, Anestesia, Ropa, Posición del paciente y al menos una sutura; el Código CUPS, las complicaciones y la técnica quirúrgica son opcionales. Confirmar con el backend de escritura.
- Objetos compuestos («X con Y») e instrumental fuera del catálogo: el editor los muestra, pero su creación detallada queda para la pantalla del catálogo de instrumental.
- Pedido del usuario (2026-10-06): el instrumental se elige viendo el catálogo completo con un buscador (no solo autocompletado), porque quien no recuerda el nombre lo reconoce al leerlo. Tras comparar referencias (lista doble, lista de reproducción con recomendados, selector en ventana) eligió «lista + sugeridos»: la lista de la técnica por tipo, sugeridos de la especialidad con su uso real y el catálogo para explorar; el mismo componente, compacto, agrega objetos a las mesas, con accesos rápidos a lo más usado en la reserva. La lista de Colecistectomía usa los nombres canónicos del catálogo (19, al separar «Bisturí #3 y #4» y «Pinzas de disección con y sin garra»).

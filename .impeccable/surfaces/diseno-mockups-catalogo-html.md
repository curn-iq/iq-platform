---
version: 1
slug: "diseno-mockups-catalogo-html"
primary_target: "diseno/mockups/catalogo.html"
related_targets: []
---

# Catálogo de técnicas

## Alcance y modo

Página pública del catálogo, a la que llevan «Ver todas las técnicas» del inicio y el menú Especialidades. Modo **Operate**: el visitante busca una técnica concreta o explora una especialidad, con el mismo peso. Sin cuenta solo se ve nombre y especialidad de cada técnica. Tocar una técnica sin cuenta abre el aviso «Crear cuenta gratis» con su nombre, sin salir del catálogo. Datos reales: las 18 técnicas del dataset en 5 especialidades. Sin cifras del catálogo (ni conteos por especialidad), sin detalles del funcionamiento interno.

## Direction contract

THESIS: un índice clínico que se acota: las especialidades en una columna fija a la izquierda y la lista de técnicas a la derecha, siempre a la vista; rechaza la cuadrícula de tarjetas de catálogo y la página de resultados con paginación.

OWN-WORLD: el de DESIGN.md sin cambios: `fondo` y `superficie` neutros, tinta petróleo, verde de marca solo en selección, foco y acciones, filetes de 1 px y el filete de 2 px en `tinta` que abre listas, Host Grotesk; nada de menta fuera de la cámara.

STORY: quien llega entiende en un vistazo qué técnicas hay por especialidad, encuentra la suya escribiendo o eligiendo una especialidad, y al tocarla recibe la invitación a crear cuenta para ver su mesa.

FIRST VIEWPORT: barra del inicio con «Especialidades» marcada como sección actual; titular «Técnicas» (escala de sección) en columnas 1-5 con una línea de apoyo; buscador ancho en 7-12. Debajo, filete de 2 px a todo el ancho; columnas 1-5 con «Todas» y las cinco especialidades como filas con su placa de selección; columnas 7-12 con la lista de técnicas agrupada por especialidad (encabezado de grupo pegajoso), filas de 15.5-17 px con flecha al señalar. Acción primaria: tocar una técnica; el aviso de cuenta se abre bajo la fila.

FORM: filtro lateral y lista, posición 2 de la lista ordenada de la primera mano; seed 8699d5b7. Movimiento firma: una placa `marca-claro` se desliza tras la especialidad elegida (`.45s expo`); reemplaza al indicador de 2 px que se había pensado, porque el piso de calidad rechaza filetes laterales de color de más de 1 px en elementos de lista y la lista se reordena con transición FLIP; la coincidencia del buscador se resalta en `marca-claro`. Estado vacío con nombre de la búsqueda y «Ver todas». En celular la columna pasa a una fila de chips con desplazamiento horizontal sobre la lista.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas

- Si «Ver todas las técnicas» del inicio debe llegar con una especialidad preseleccionada cuando se viene del menú.

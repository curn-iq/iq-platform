---
version: 1
slug: "diseno-mockups-simiq3d-html"
primary_target: "diseno/mockups/simiq3d.html"
related_targets: []
---

# diseno/mockups/simiq3d.html

Modo: **Operate**. Pantalla de exploración de SIMIQ3D (rutas `/simiq3d` y `/simiq3d/tecnicas/:id` del frontend de Juan). Construcción guiada por código (sin generación de imágenes).

Quién y para qué: estudiante de Instrumentación Quirúrgica, sobre todo en celular, que pregunta por una técnica o un instrumento y quiere ver cómo queda la mesa de Mayo antes de practicarla con SIVRI. Datos reales: las cinco mesas de Mayo de Cirugía General de DataIQ. Lo que la fuente no trae (tamaño de la mesa, orientación, descripción de cada instrumento, respuestas del modelo) va marcado «demostración» o «provisional».

Estados que muestra: normal, cargando, chat no disponible (Servidor PC2 apagado), pregunta sin respuesta, pregunta ambigua (instrumento sin técnica abierta) y navegador sin WebGL. Se eligen con `#estado=` en la URL.

Decidido por Mauricio el 2026-10-20: escena con Three.js real (no CSS) y composición tipo IDE, con el chat como panel lateral a la izquierda y la escena ocupando el resto.

## Direction contract

THESIS: Un banco de trabajo, no un chatbot: el chat vive como el panel lateral de un IDE y la mesa de Mayo en 3D es el lienzo que ocupa la pantalla. Rechaza el chat centrado con burbujas y el visor de producto girando en el vacío.

OWN-WORLD: El mundo de DESIGN.md sin cambios: fondo blanco frío, tinta petróleo, filetes de 1 px, verde quirúrgico como marca, Host Grotesk y Martian Mono solo para datos (fila · columna). En el lienzo, la funda verde de la mesa con el acero del instrumental bajo luz clara de quirófano, sin sombras en tiempo real.

STORY: El estudiante pregunta («¿dónde va la Kelly?»), la escena viaja a esa pieza y la levanta, y la leyenda marca su número; al tocar cualquier instrumento lee qué es y en qué celda va. Sale sabiendo cómo se arma la mesa.

FIRST VIEWPORT: Barra del shell (72 px). Izquierda: panel de chat de 380 px que al entrar dice «Elige una técnica para verla en 3D» con una opción por técnica, y el campo de pregunta abajo (la acción principal). Derecha: el lienzo con la mesa vacía, «Explorar en 3D» y el selector de técnica arriba a la izquierda, la leyenda plegada a la derecha y los controles de vista abajo a la derecha, con las opciones (escala, números, cuadrícula) escondidas en su panel. Nada viene señalado de entrada. En celular el lienzo ocupa todo, el campo de pregunta queda abajo con la última respuesta y sus opciones, y el historial se abre como panel desde la izquierda. Colores de módulo: el azul de quirófano en la interfaz; el verde solo en el logo y en la funda.

FORM: Fijada por el usuario (panel lateral tipo IDE), sin concept-seed. Movimiento firma: al responder, la cámara viaja a la pieza (expo, ~0,9 s), la levanta y pinta su celda en marca-claro; chat, escena y leyenda señalan lo mismo.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

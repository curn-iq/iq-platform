---
version: 1
slug: "diseno-mockups-cuenta-html"
primary_target: "diseno/mockups/cuenta.html"
related_targets: []
---

# Ingresar / Crear cuenta

## Alcance y modo

La «puerta» del shell de navegación: una sola pantalla con las pestañas Ingresar y Crear cuenta. Modo **Operate**. Se llega desde «Ingresar» y «Crear cuenta» de la barra, «Crear cuenta gratis» de la portada y el aviso de cuenta del catálogo (con la técnica que se quiso abrir). Campos según el esquema `Usuario`: nombre, correo, contraseña y aceptación de la política de tratamiento de datos (Decreto 1377, art. 8). «Continuar con Google» en las dos pestañas, porque las cuentas institucionales de los estudiantes están en Google (pedido del usuario). «¿Olvidaste tu contraseña?» solo como enlace. Mockup visual: los botones navegan como si se hubiera ingresado (a la técnica pedida o al catálogo), sin autenticación real.

## Direction contract

THESIS: la puerta muestra lo que abre: a la izquierda la técnica que el estudiante quiso ver, con su contenido atenuado detrás de la cuenta; a la derecha el formulario. Rechaza la tarjeta de ingreso sola en el centro de una pantalla vacía.

OWN-WORLD: el de DESIGN.md: la mitad izquierda en `fondo` y la derecha en `superficie` con filete, como la ventana de DataIQ; tinta petróleo, verde de marca en la acción principal y la pestaña elegida; pestañas con la raya de 2 px del detalle; filetes de 1 px; Host Grotesk.

STORY: el estudiante reconoce la técnica que quería abrir y entiende que basta una cuenta gratuita (o su cuenta de la universidad con Google) para verla por dentro; ingresa o se registra aceptando la política de datos y vuelve a la técnica.

FIRST VIEWPORT: barra; columnas 1-6 sobre `fondo` con la técnica (nombre a 40 px, especialidad, las pestañas Datos clínicos / Instrumental / Mesa de Mayo / Mesa de reserva atenuadas y un cuerpo de barras con un candado); columnas 7-12 sobre `superficie` con las pestañas Ingresar / Crear cuenta, «Continuar con Google», separador «o con tu correo», el formulario y el botón principal. Sin técnica, la izquierda muestra el catálogo en general.

FORM: «La técnica que ibas a abrir», posición 6 de la lista ordenada; seed ffbc68e1. Movimiento firma: la raya de las pestañas se desliza entre Ingresar y Crear cuenta y el formulario cambia sin recargar.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas

- Ingresar con Google: el backend hoy es autenticación propia (JWT + Argon2id) y `Usuario.password_hash` es obligatorio; sumar Google exige un proveedor externo y usuarios sin contraseña.
- Recuperar contraseña: sin pantalla ni endpoint en el Corte 2.

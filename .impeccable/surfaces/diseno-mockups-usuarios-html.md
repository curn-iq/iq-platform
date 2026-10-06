---
version: 1
slug: "diseno-mockups-usuarios-html"
primary_target: "diseno/mockups/usuarios.html"
related_targets: []
---

# Usuarios y roles

## Alcance y modo

Pantalla del rol `admin` (el equipo operativo del proyecto), modo **Operate**. Se llega desde «Mi cuenta» → «Usuarios y roles». Decisiones del usuario: los roles solo se asignan (no hay solicitudes en la plataforma; la verificación de que alguien es docente o instrumentador titulado se hace por fuera); además se suspenden cuentas (sin borrar datos ni lo publicado), se ve el historial de cambios y el consentimiento de datos de cada persona (fecha y versión de la política, Decreto 1377); de cada persona se muestra lo mínimo: nombre, correo, rol, registro y su actividad en DataIQ, nada de su estudio. Estructura elegida «Personas por rol», con el riesgo resuelto a pedido del usuario: los usuarios serán cientos, así que su columna no lista a todos. Personas y cifras de demostración; los admins son el equipo operativo real.

## Direction contract

THESIS: el reparto del poder de publicar se ve de un vistazo: una columna por rol con quién lo tiene; los pocos con permisos (admin, revisores, colaboradores) se listan completos y los muchos usuarios se buscan. Rechaza la tabla paginada de usuarios con un menú de rol por fila.

OWN-WORLD: el de DESIGN.md: `fondo`, columnas reguladas por filete con su título y cifra, personas como filas con avatar de iniciales en `marca-claro`, la ficha en `superficie` con anillo de 1 px y radio 16, el rol en pastilla, el cambio de rol como control segmentado con la placa `marca-claro` que se desliza (como los filtros), confirmación en panel; suspender en `tinta`, nunca rojo; Host Grotesk, cifras tabulares.

STORY: el admin ve cuántos tienen cada rol, busca a una persona por nombre o correo (o la toma de su columna), abre su ficha, le cambia el rol con una confirmación que recuerda verificar a los revisores, o suspende su cuenta, y puede revisar el historial de cambios.

FIRST VIEWPORT: barra con «Mi cuenta» (admin); título «Usuarios y roles» con «demostración», buscador global grande y la pestaña «Historial»; cuatro columnas: Admin, Revisores y Colaboradores con sus personas, Usuarios con la cifra total, su propio buscador y los registrados recientemente; a la derecha la ficha de la persona elegida.

FORM: «Personas por rol», posición 3 de la lista ordenada; seed 7299178d; ajustada por el usuario (columna de usuarios por búsqueda). Movimiento firma: al cambiar el rol, la persona sale de su columna y entra en la nueva.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas

- El esquema no tiene cómo suspender una cuenta (`Usuario` no tiene estado) ni dónde guardar el historial de cambios de rol; hay que agregarlos en el backend.

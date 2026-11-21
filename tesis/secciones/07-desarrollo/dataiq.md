# Desarrollo del módulo DataIQ

## Qué lleva

- Arquitectura.
- Modelo de datos (con la figura del modelo entidad-relación).
- Versionado de técnicas y modelo de roles (con la tabla de roles).
- Seguridad.
- Construcción del dataset.
- Interoperabilidad (cómo lo leen SIVRI y SIMIQ3D).
- Infraestructura de despliegue.
- Diseño de la interfaz.

## Fuentes en el repositorio

- [`dataiq/README.md`](../../../dataiq/README.md).
- Esquema: [`dataiq/docs/esquema.dbml`](../../../dataiq/docs/esquema.dbml) y su
  diagrama `dataiq/docs/diagramabd.png`.
- [`dataiq/docs/checklist-backend.md`](../../../dataiq/docs/checklist-backend.md)
  y [`dataiq/docs/checklist-frontend.md`](../../../dataiq/docs/checklist-frontend.md).
- [`docs/flujos.md`](../../../docs/flujos.md).

## Texto

### Cambios del tercer corte

En el tercer corte el backend de DataIQ pasó del prototipo del segundo corte a
un servicio en producción. Mauricio Lugo lo desarrolló con asistencia de Claude
Code; el frontend de DataIQ y el shell de navegación, en Angular, los desarrolló
Juan Caraballo, por fases.

- **Código en inglés** (decidido por el equipo el 2026-10-13): nombres de
  tablas, columnas, rutas y campos en inglés; mensajes, documentación e
  interfaz en español.
- **Contenedor e integración continua:** imagen de contenedor del backend y
  pruebas automáticas en cada PR.
- **Despliegue en Vercel** (2026-10-14), con la base en Neon.
- **Sesión con cookie y token corto para los módulos**, descritos en la
  plataforma común.
- **Aviso de privacidad y supresión de cuentas** (2026-10-29), conforme a la
  Ley 1581 de 2012 y al Decreto 1377 de 2013; la aceptación del aviso queda
  registrada en cada cuenta.
- **Límite de intentos** al ingresar y al registrarse (2026-11-02).
- **Descripción del instrumental de la mesa de Mayo, con su fuente**
  (2026-10-28), que SIMIQ3D muestra al tocar un instrumento.
- **Gestión de versiones para el frontend:** las versiones con su contenido,
  sus rechazos y el filtro por técnica, y la actividad de cada cuenta.

### Mesas de Mayo medidas en las fotos de IQ

Las mesas de Mayo de las cinco técnicas de Cirugía General se actualizaron con
las listas que entregó el programa de Instrumentación Quirúrgica y con las
fotos tomadas en la visita del 2026-11-18 (versiones publicadas el
2026-11-19 y el 2026-11-20). El 2026-11-21 se agregó al esquema la posición
medida y el giro de cada instrumento (`position_x_m`, `position_z_m`,
`yaw_deg` y `additional_placements` en `item_components`), con dos
migraciones que solo agregan columnas. Las posiciones se midieron en las fotos
«Bien armada», enderezadas con los cuatro marcadores ArUco y a escala con su
cuadrado de 6 cm; las lecturas dudosas quedan marcadas como «propuesto».
Desde el mismo día, cada instrumento de la mesa es su propio objeto de la
leyenda (las tijeras, los mangos y las dos pinzas de disección dejaron de
agruparse), por decisión de Mauricio Lugo. Las mesas se publican en
producción como versiones nuevas, sin borrar el historial.

# Después del MVP

Ideas que no entran al MVP pero que se quieren retomar después. El MVP es una
sola plataforma, la de la CURN, abierta a estudiantes de cualquier institución
(decisión del 2026-10-05, ver `CLAUDE.md`).

## Que otras instituciones monten su propia IQ Platform

La idea es seguir el modelo de Moodle, Open edX y DHIS2: el código es abierto
y cada institución que quiera usar sus propias técnicas descarga el software y
monta su propia copia, con sus propias cuentas, datos y responsables.

### Cómo lo hacen los proyectos parecidos

| Software | Cómo lo usan las instituciones |
|---|---|
| Moodle | Cada institución lo instala en sus servidores. Quien no tiene equipo técnico paga MoodleCloud, el alojamiento que ofrece el propio Moodle, con límites de usuarios y espacio. |
| Open edX | Cada institución monta su copia o contrata a una empresa que se la opera. edX.org es solo un sitio más que usa ese software. |
| DHIS2 / OpenMRS | Cada país u hospital es dueño de su copia y de sus datos. Una comunidad y una fundación mantienen el código. |

Lo que tienen en común: documentación de instalación, una comunidad que
mantiene el código y alguien que opera la plataforma para quien no puede.

Fuentes: [Moodle](https://edzlms.com/moodle-deployment-options-self-hosted-vs-cloud-vs-workplace-how-to-choose-2026-guide/),
[MoodleCloud](https://www.wooclap.com/en/blog/moodle-pricing/),
[Open edX](https://openedx.org/get-started/self-managed/),
[DHIS2](https://en.wikipedia.org/wiki/DHIS2).

### Lo que haría falta

- Una guía de instalación paso a paso (cuentas, claves con que se firman los
  inicios de sesión, migraciones, primer usuario administrador).
- Un catálogo base para no arrancar vacío. Las técnicas de la CURN son autoría
  de su programa de IQ (Ley 23 de 1982): compartirlas requiere su
  autorización.
- Forma de cargar técnicas desde la plataforma, no solo con scripts.
- Definir qué pasa con SIVRI: el modelo de visión se entrena con el
  instrumental de la CURN y otra institución podría necesitar reentrenarlo.
- Cada institución responde por los datos personales de sus usuarios
  (Ley 1581 de 2012) y necesita su propia política de datos.

### Lo que ya ayuda

- El código es abierto (MIT).
- Los ids son UUIDv7: el catálogo base tiene la misma identidad en todas las
  copias, y los mapeos de SIVRI y SIMIQ3D sirven en cualquiera.

## Gestión de cuentas y revisión

Salieron al diseñar las pantallas de Usuarios y roles y de Por revisar. Para
el MVP no hacen falta: quien publica son pocas personas asignadas por el
equipo, y a una cuenta se le quitan permisos bajándole el rol a `usuario`.

- **Suspender una cuenta.** `Usuario` no tiene un estado para eso.
- **Historial de cambios de rol**: quién le cambió el rol a quién y cuándo.
  Hoy no hay tabla para eso.
- **«Revisando ahora»**: marcar que un revisor tiene abierta una versión (con
  quién y desde cuándo, y que expire) para que otro no la tome a la vez. En el
  MVP basta con que aprobar o rechazar fallen si otro revisor ya decidió la
  versión.

## Cuentas e inicio de sesión

- **Renovar la sesión sin volver a ingresar** (refresh tokens). En el MVP el
  token dura 12 horas y después hay que iniciar sesión otra vez.
- **Recuperar la contraseña por correo.** Hace falta un servicio de envío de
  correos.
- **Limitar los intentos de inicio de sesión** para frenar a quien prueba
  contraseñas por fuerza bruta.
- **Una clave propia para SIVRI y SIMIQ3D** al pedir `/catalogo/completo`, si
  algún día lo piden sin que haya una persona usando el módulo. En el MVP lo
  piden con el token de quien lo usa.

## Opciones descartadas para el MVP

- **Una plataforma con espacios por institución** (cada una con su catálogo y
  sus revisores dentro de la misma plataforma): exige cambiar el esquema y el
  backend, y convierte a la CURN en operadora de otras instituciones. Es el
  modelo de las empresas que venden alojamiento, no el de un proyecto
  académico.

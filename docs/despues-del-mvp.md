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
- Que el catálogo base tenga los mismos ids en todas las copias: fijarlos en
  la carga inicial (una columna de ids en `seed/tecnicas.xlsx`). Hoy la carga
  los genera, y SIVRI y SIMIQ3D traducen su mapeo por nombre del instrumento
  en cada copia.

### Lo que ya ayuda

- El código es abierto (MIT).
- Los ids son UUIDv7: no se repiten entre copias.

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
  token dura 2 horas y después hay que iniciar sesión otra vez.
- **Pasar las APIs a un dominio propio** (`app.dominio.com` para el frontend y
  `api.dominio.com` para las APIs), si la institución lo financia. Quita el
  paso por el proxy de Vercel. Qué cambia:
  `CORS_ORIGINS=["https://app.dominio.com"]` en cada API; el frontend llama a
  la URL completa con `withCredentials: true` y sigue mandando `X-IQ-Client`.
  La cookie sirve igual porque los subdominios son el mismo sitio; si cada
  módulo queda en un subdominio distinto, la cookie necesita
  `Domain=dominio.com` y dejar el prefijo `__Host-`. El código del backend no
  cambia.
- **Recuperar la contraseña por correo.** Hace falta un servicio de envío de
  correos.
- **Limitar los intentos de inicio de sesión** para frenar a quien prueba
  contraseñas por fuerza bruta.
- **Una clave propia para SIVRI y SIMIQ3D** al pedir `/catalog/full`, si
  algún día lo piden sin que haya una persona usando el módulo. En el MVP lo
  piden con el token de quien lo usa.
- **Cuentas desde los 14 años.** En el MVP solo se registran mayores de 18
  ([`privacidad.md`](privacidad.md)). La guía de la Superintendencia de
  Industria y Comercio sobre datos en universidades (2026) cita un concepto
  según el cual, en el contexto educativo, un adolescente puede dar la
  autorización por sí mismo; sirve para el bachiller que quiere conocer la
  carrera. Cambia el aviso de privacidad y su versión.
- **Borrar la cuenta desde «Mi cuenta»**, con un plazo para arrepentirse: la
  cuenta se desactiva y se borra sola al vencer. El plazo no puede pasar de
  los 15 días hábiles que da la ley para atender un pedido de supresión
  (Ley 1581 de 2012, art. 15), y necesita una tarea diaria que borre las
  vencidas. En el MVP la supresión la hace el equipo por terminal
  (`delete_account`), cuando llega el pedido por el canal del aviso.
- **Un correo propio del proyecto** para preguntas sobre la plataforma. En el
  MVP el único canal es el de la CURN, que es la responsable.

## SIVRI

- **Reconocer en el celular** (YOLO exportado a ONNX en el navegador) en vez
  de en el backend: no viaja video por internet, no gasta datos móviles del
  estudiante ni CPU del servidor. En el MVP reconoce el backend: un solo
  lenguaje (Python), el modelo evaluado es el que se usa y todos los celulares
  reciben la misma calidad.

## SIMIQ3D

- **Un modelo de lenguaje más grande** que Qwen3-VL 8B, el del MVP: necesita
  una GPU con más memoria que los 8 GB de la RX 6600 XT del Servidor PC2.
  Se elige con el mismo banco de preguntas, para comparar la exactitud.
- **Usarlo sin conexión** (PWA con service worker): precargar la app y los
  modelos, e instalarla en el celular. En el MVP basta la caché HTTP, que
  guarda la app y los modelos después de la primera visita; el chat necesita
  conexión de todas formas (decidido por Juan el 2026-10-15).

Formas de evaluarlo que van más allá de lo que pide el MVP (revisadas el
2026-10-15; lo del MVP está en [`simiq3d/README.md`](../simiq3d/README.md)):

- **Prueba de transferencia con SIVRI:** el estudiante explora en SIMIQ3D una
  mesa que nunca ha armado, la arma en la mesa real y SIVRI le da el puntaje.
  Une los tres módulos y es descriptiva (sin grupo de control); depende de que
  SIVRI esté listo y de su propio error.
- **Índice de validez de contenido (I-CVI)** de los modelos 3D: de 3 a 5
  docentes califican de 1 a 4 la fidelidad de cada modelo; pasa con
  I-CVI ≥ 0,83 (Lynn, 1986; Polit y Beck, 2006).
- **Reconocimiento a ciegas:** mostrar cada modelo sin su nombre y pedir que
  digan qué instrumento es.
- **BUS-11** (Borsci et al.): escala de usabilidad específica para chatbots,
  validada en español; mide lo que la SUS no ve del chat.
- **Prueba con tareas y pensamiento en voz alta** («encuentra dónde va la
  Babcock en la mesa de Eventrorrafia»): si lo logra, cuánto tarda y dónde se
  traba.
- **Grupos 2D frente a 3D, o antes y después:** la única que permite hablar de
  causa, pero cambia el diseño no experimental del Formato 115, y los estudios
  de 2D frente a 3D en formación quirúrgica son pequeños y con resultados
  mixtos.

## Infraestructura

- **Volver a Google Cloud Run** (o tener un servidor fijo para SIVRI) si la
  institución financia la cuenta de facturación: en Colombia exige un prepago
  de COP 100.000. La imagen del backend ya está en ghcr.io, así que el cambio
  es de despliegue, no de código.
- **Organización en Google Cloud** con un dominio propio y Cloud Identity Free
  (gratis): los proyectos dejan de depender de una cuenta personal. El mismo
  dominio sirve para las APIs en subdominios (ver «Cuentas e inicio de
  sesión»).

## Opciones descartadas para el MVP

- **Una plataforma con espacios por institución** (cada una con su catálogo y
  sus revisores dentro de la misma plataforma): exige cambiar el esquema y el
  backend, y convierte a la CURN en operadora de otras instituciones. Es el
  modelo de las empresas que venden alojamiento, no el de un proyecto
  académico.

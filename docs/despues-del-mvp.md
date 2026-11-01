# Después del MVP

Ideas que no entran al MVP pero que se quieren retomar después. Hay una sola
plataforma, la de la CURN, con registro libre para estudiantes y docentes de
cualquier institución, que usan el catálogo de la CURN (ver «Opciones
descartadas»).

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
- **Comentarios de revisión aparte**, por sección y por objeto de la mesa, y
  una nota del autor al enviar a revisión. En el MVP los comentarios van
  juntos en el motivo de la devolución y no hay nota del autor.
- **Consultar las técnicas archivadas** (un revisor las ve en el catálogo con
  su historial). En el MVP la API solo expone lo publicado.
- **Cambiar el nombre o la especialidad de una técnica publicada.** En el MVP
  se eligen al crearla y no hay ruta para cambiarlos.

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
  correos. En el MVP la pantalla de ingreso no lo ofrece.
- **Ingresar con Google** (cuentas personales e institucionales). Hace falta
  OAuth en el backend de DataIQ y declararlo en el aviso de privacidad.
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

## SIVRI y SIMIQ3D con fuentes propias

Decidido por Mauricio el 2026-10-30: el semestre siguiente al MVP (la fase
preliminar, ver el [README](../README.md)), SIVRI y SIMIQ3D se rehacen con
fuentes propias.

- **Fotos propias de todo el instrumental y de las técnicas**, con medidas
  exactas. En el MVP, los modelos 3D salen de referencias de catálogo de
  fabricantes y distribuidores.
- **Medir la mesa de Mayo del laboratorio** (el área entre los marcadores
  ArUco). En el MVP, SIMIQ3D usa una mesa de tamaño provisional, la misma para
  todas las técnicas.
- **Hacia dónde apunta cada instrumento**, según las fotos de las mesas bien
  armadas: si todos siguen una misma regla, la regla vive en SIMIQ3D; si
  cambia de un instrumento a otro, es parte del arreglo y va en DataIQ (cambio
  de su esquema y de su editor). En el MVP, todos apuntan igual.

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

## Opciones descartadas

- **Una plataforma por institución**, sea una copia que cada institución
  instala (como Moodle u Open edX) o espacios por institución dentro de esta,
  cada uno con su catálogo y sus revisores. Descartada por Mauricio el
  2026-10-30 (el 2026-10-05 se había dejado para después del MVP):
  - El registro es libre: un estudiante o un docente de cualquier institución
    ya puede usar la plataforma de la CURN.
  - Las técnicas son autoría del programa de Instrumentación Quirúrgica de la
    CURN (Ley 23 de 1982): otra copia no podría llevar el catálogo sin su
    autorización y arrancaría vacía.
  - Preparar instalaciones para terceros (guía, soporte, catálogo base, ids
    fijos entre copias, reentrenar SIVRI) es el trabajo de una comunidad o una
    fundación, no el de un proyecto de grado; los espacios por institución,
    además, exigen cambiar el esquema y el backend.
  - El código es abierto (MIT): quien quiera montar su propia copia puede
    hacerlo por su cuenta.

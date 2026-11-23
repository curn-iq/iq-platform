# Anexos A y B: registro de los cortes anteriores

Los anexos A (primer corte) y B (segundo corte) reproducen el registro que se
entregó en cada corte, sin cambios de contenido salvo uno: se precisó quiénes
participaron en las reuniones (tres estudiantes y su docente tutora; el texto
entregado decía «sus docentes»). La numeración de sus tablas y figuras se
ajustó a la de este documento. Lo que cambió después se
registra en el Anexo D ([`d-tercer-corte.md`](d-tercer-corte.md)), que sigue
el mismo orden.

## Anexo A. Registro de avance del primer corte

El presente anexo documenta las actividades desarrolladas durante el primer corte académico, correspondientes a las fases de diagnóstico y diseño de la metodología adoptada. En este periodo no se ejecutaron actividades de desarrollo de software; los productos obtenidos son de naturaleza documental y arquitectónica.

### A.1 Reuniones de trabajo con el programa de Instrumentación Quirúrgica

El levantamiento de requerimientos se realizó mediante tres reuniones de trabajo con tres estudiantes del programa de Instrumentación Quirúrgica y el acompañamiento de su docente tutora, conforme al primer objetivo específico. La Tabla XVIII resume el propósito y los acuerdos alcanzados en cada una.

**TABLA XVIII. Reuniones de trabajo del primer corte**

| N.° | Propósito | Acuerdos alcanzados |
|---|---|---|
| 1 | Definición de alcance y roles | Se acordó la estructura del proyecto en tres módulos; el programa de Instrumentación Quirúrgica documenta las técnicas quirúrgicas y el equipo de Ingeniería de Sistemas desarrolla la plataforma de digitalización; se difiere el módulo de modelado 3D a una fase posterior. |
| 2 | Revisión de la documentación de técnicas | Se revisó el documento entregado y se verificó su cobertura por especialidad; se solicitó precisar las cantidades de instrumental asociadas a cada técnica con el fin de estructurar el registro. |
| 3 | Ajuste del criterio de registro | Por indicación docente se determinó que el dato relevante para el sistema no es la cantidad de instrumental, variable según el procedimiento y el método de trabajo, sino su posición en el arreglo de mesa; se confirmó que dichas posiciones ya se encontraban documentadas gráficamente. |

*Fuente: elaboración propia.*

### A.2 Insumo clínico recibido

El programa de Instrumentación Quirúrgica entregó un documento con dieciséis técnicas quirúrgicas distribuidas en cuatro especialidades —cirugía general, urología, nefrología y ginecología—, complementado posteriormente con un documento de listas de chequeo que incorporó procedimientos de ortopedia. Cada técnica describe la posición del paciente, el tipo de anestesia, el instrumental requerido, las suturas, los equipos biomédicos, los dispositivos médico-quirúrgicos, la secuencia operatoria y el arreglo de las mesas de Mayo y de reserva con sus posiciones numeradas.

Quedan pendientes dos precisiones sobre el insumo: el arreglo de mesa correspondiente a la nefrectomía por laparoscopia, aún no documentado, y la aclaración de si las dos entradas registradas bajo el nombre de prostatectomía corresponden a las variantes abierta y laparoscópica o a un duplicado. La normalización de la nomenclatura del instrumental y la asignación formal del campo de especialidad son responsabilidad del equipo de Ingeniería de Sistemas durante la digitalización.

### A.3 Decisiones técnicas adoptadas

Las decisiones de arquitectura y de tecnología se tomaron durante la fase de diseño y se documentan en la Tabla XIX junto con las alternativas consideradas y su justificación.

**TABLA XIX. Decisiones técnicas del primer corte**

| Ámbito | Decisión | Alternativas consideradas | Justificación |
|---|---|---|---|
| Arquitectura de software | Hexagonal | Por capas, microservicios | Permite integrar SIVRI y SIMIQ3D como adaptadores externos sin alterar el núcleo de negocio |
| Modelo de detección | YOLO26 | YOLOv8, DETR, ViT | Versión de producción vigente, con inferencia de extremo a extremo optimizada para CPU |
| Backend | Python y FastAPI | Flask, Django, Java y Spring | Soporte asíncrono nativo y continuidad de lenguaje con el módulo de visión artificial |
| Base de datos | PostgreSQL | MongoDB, MySQL, SQLite | El esquema del dominio es fijo y sus cardinalidades quedaron definidas en el modelo entidad-relación |
| Frontend | Svelte | React, Vue, Angular | Compila sin framework en el paquete final, lo que reduce el consumo de recursos en el cliente |
| Almacenamiento de imágenes | Cloudflare R2 | Google Cloud Storage, AWS S3 | Sin costo por transferencia de salida y compatible con la API S3 |
| Enfoque del módulo 3D | Composición con modelos pre-elaborados | Generación neural de geometría | Elimina el riesgo de alucinación morfológica sobre instrumental clínico y preserva la trazabilidad |

*Fuente: elaboración propia.*

### A.4 Productos del corte

Los productos obtenidos son el modelo entidad-relación del módulo DataIQ, presentado en la Fig. 36; el documento de planificación del módulo con su alcance, dependencias y entregables por corte; el documento de justificación del stack tecnológico; y el repositorio del proyecto, estructurado en carpetas independientes por módulo y publicado bajo licencia MIT para garantizar la reproducibilidad del desarrollo y su continuidad por parte de futuros equipos.

El modelo entidad-relación traduce la documentación clínica a una estructura relacional. Las entidades Especialidad y Técnica organizan el catálogo de procedimientos; las entidades Instrumental, Sutura, Equipo Biomédico y Dispositivo Médico constituyen catálogos maestros normalizados; y las tablas intermedias resuelven las relaciones de cardinalidad múltiple. La tabla que vincula técnica e instrumental incorpora los atributos de zona y posición, que registran el arreglo espacial acordado en la tercera reunión de trabajo.

> **[Imagen]** Figura 8 del segundo corte: modelo entidad-relación del primer corte.
>
> *Fig. 36. Modelo entidad-relación del módulo DataIQ en el primer corte. Fuente: elaboración propia.*

## Anexo B. Registro de avance del segundo corte

El presente anexo documenta las actividades desarrolladas durante el segundo corte académico, correspondientes a la actividad de diseño y desarrollo de la metodología adoptada (sección VI). En este periodo se desarrolló el módulo DataIQ y se diseñaron los prototipos de interfaz de la capa de navegación y de DataIQ; los módulos SIVRI y SIMIQ3D no tuvieron desarrollo.

### B.1 Actividades del corte

La Tabla XX resume las actividades realizadas y su producto.

**TABLA XX. Actividades del segundo corte**

| N.° | Actividad | Producto |
|---|---|---|
| 1 | Definición de la infraestructura de despliegue | Hoja de infraestructura con proveedores, planes y límites gratuitos |
| 2 | Implementación del modelo de datos en PostgreSQL 18 | Dieciocho tablas con sus restricciones y migraciones |
| 3 | Definición del modelo de roles y del flujo de publicación de técnicas | Diagramas de flujo por rol |
| 4 | Diseño de los prototipos de la capa de navegación y de DataIQ | Nueve pantallas navegables y sistema de diseño |
| 5 | Transcripción de los arreglos de mesa a la cuadrícula y normalización de sus objetos | Arreglos de mesa transcritos y catálogo ampliado |
| 6 | Elaboración del documento de pendientes para el programa de Instrumentación Quirúrgica | Lista de los datos de los arreglos que no podían interpretarse sin suponer |
| 7 | Construcción del dataset de las dieciocho técnicas | Matriz con datos clínicos, códigos CUPS, suturas, equipos, dispositivos, mesas y fuentes |
| 8 | Desarrollo del backend de DataIQ | Reglas del dominio, acceso a datos, API, autenticación y pruebas automatizadas |

*Fuente: elaboración propia.*

### B.2 Cambios respecto al primer corte

La Tabla XXI registra las decisiones del primer corte que cambiaron y su motivo.

**TABLA XXI. Cambios respecto al primer corte**

| Aspecto | Primer corte | Segundo corte | Motivo |
|---|---|---|---|
| Alcance | El módulo de modelado 3D se difería a una fase posterior (Tabla XVIII) | Los tres módulos se desarrollan en paralelo durante el semestre | Sugerencia del tutor del proyecto |
| Objetivos | Orientados a un sistema de retroalimentación con inteligencia artificial | Orientados al ecosistema de tres módulos; el objetivo 4 incluye SIMIQ3D | Incorporación de SIMIQ3D al alcance |
| Validación de SIVRI | Según el tiempo quirúrgico | Según la técnica quirúrgica; la validación por tiempo quirúrgico queda como trabajo futuro | Delimitación del alcance del semestre |
| Frontend | Svelte | Por definir a partir de los prototipos de interfaz | La tecnología se decide con base en el diseño |
| Almacenamiento de imágenes | Cloudflare R2 | Por definir | Por definir |
| Modelo de datos | Una tabla que vincula técnica e instrumental con zona y posición | Versionado de técnicas, objetos de mesa con sus componentes y posiciones en cuadrícula | Permitir la revisión antes de publicar y registrar los objetos compuestos |
| Insumo clínico (A.2) | Dos precisiones pendientes | El programa confirmó que las dos prostatectomías son procedimientos distintos; el arreglo de la nefrectomía por laparoscopia se propuso para su validación | — |

*Fuente: elaboración propia.*

### B.3 Decisiones técnicas adoptadas

Las decisiones técnicas del segundo corte se documentan en la Tabla XXII junto con las alternativas consideradas y su justificación.

**TABLA XXII. Decisiones técnicas del segundo corte**

| Ámbito | Decisión | Alternativas consideradas | Justificación |
|---|---|---|---|
| Identificadores | UUIDv7 generados por la base de datos | Enteros autoincrementales | El catálogo conserva la misma identidad en cualquier instalación y SIVRI y SIMIQ3D lo referencian de forma estable |
| Firma de tokens | EdDSA con clave pública publicada | RS256; HS256 con secreto compartido | Solo DataIQ tiene la clave privada; los demás módulos validan sin compartir secretos |
| Edición de técnicas | Versionado con revisión | Edición directa del contenido publicado | Ningún contenido llega a los estudiantes sin la aprobación de un revisor |
| Arreglo de mesa | Cuadrícula de filas y columnas | Coordenadas continuas | Los arreglos de la fuente son diagramas hechos a mano, no medidos |
| Revisiones simultáneas | Bloqueo del registro al decidir | Marca de 'revisando ahora' | Evita que dos revisores decidan la misma versión sin agregar estructuras |
| Acceso | Catálogo y datos clínicos públicos; instrumental, mesas y módulos con cuenta gratuita | Todo con cuenta | El riesgo a controlar es la publicación de contenido incorrecto, no su lectura |
| Despliegue | Cloud Run, Neon, Vercel y GitHub Container Registry en capa gratuita | Crédito temporal de Google Cloud; Artifact Registry | Sin fecha de vencimiento y dentro de los límites gratuitos |

*Fuente: elaboración propia.*

### B.4 Productos del corte

Los productos obtenidos son la base de datos del módulo DataIQ con sus migraciones; el backend con arquitectura hexagonal; la API con su documentación interactiva; el módulo de autenticación; el dataset de las dieciocho técnicas cargado; las 69 pruebas automatizadas; los prototipos navegables de la capa de navegación y de DataIQ con su sistema de diseño; la definición de la infraestructura de despliegue; y el modelo entidad-relación actualizado, que en el tercer corte se presenta en la Fig. 3 (desarrollo de DataIQ). Todo está publicado en el repositorio del proyecto bajo licencia MIT.

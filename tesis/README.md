# Tesis (Formato 115)

Este directorio es **el informe del trabajo de grado**: el texto completo de
cada sección del Formato 115, las figuras, los resultados de las evaluaciones
y las referencias. Lo trabaja el equipo de Ingeniería de
Sistemas, cada quien en la sección que le toca, con el mismo flujo de PR que
el resto del repositorio. Lo decidió Mauricio el 2026-11-21: el equipo trabaja
en GitHub y el Drive solo guarda el documento entregado en cada corte.

Desde el tercer corte, este directorio es la fuente que se evalúa (decidido
por Mauricio el 2026-11-23): el texto de cada sección está completo aquí,
incluidos los anexos de los cortes anteriores, y no depende de la copia del
Drive (`ENTREGABLES/`, carpeta «Tesis ING-IQ - CURN»), que guarda lo entregado
en el primer y el segundo corte.

## Cómo está organizado

Los archivos siguen el orden del Formato 115 (modalidad Desarrollo
Tecnológico de la CURN, formato IEEE adaptado). Cada sección del documento
tiene un solo archivo, numerado como aparece en el documento:

```
tesis/
├── README.md                    este archivo
├── checklist.md                 qué falta en cada sección (el único lugar del avance)
├── secciones/
│   ├── 00-resumen.md            Resumen y Abstract
│   ├── 01-introduccion.md
│   ├── 02-planteamiento-del-problema.md
│   ├── 03-justificacion.md
│   ├── 04-objetivos.md
│   ├── 05-marco-de-referencia.md
│   ├── 06-metodologia.md
│   ├── 07-desarrollo/           un archivo por módulo, en este orden
│   │   ├── dataiq.md
│   │   ├── plataforma.md        lo común: shell, sesión e infraestructura
│   │   ├── simiq3d.md
│   │   └── sivri.md
│   ├── 08-resultados.md
│   ├── 09-discusion.md
│   ├── 10-conclusiones.md
│   ├── 11-recomendaciones.md
│   └── 12-referencias.md
├── anexos/
│   ├── a-b-cortes-anteriores.md lo que ya se entregó en los Cortes 1 y 2
│   ├── c-enlaces.md             enlaces a los productos
│   ├── d-tercer-corte.md        registro de avance del tercer corte
│   └── e-instrumentos.md        SUS, cuestionario de pertinencia y consentimiento
├── herramientas/                numerar.py: numera referencias, tablas y figuras
├── figuras/                     imágenes listas para el documento, con su índice
└── evidencias/                  resultados exportados de las evaluaciones
```

Cada archivo empieza con un comentario HTML, que GitHub no muestra, con las
notas de trabajo: **qué lleva** la sección según el Formato 115 y **de dónde
salen sus datos** en el repositorio. Después del comentario va el texto del
informe.

## Cómo se trabaja

- **Una rama y un PR por cambio**, como en el resto del repo (por ejemplo,
  `docs/tesis-resultados-simiq3d`), con el commit
  `docs(tesis): …`.
- **Lo que falta va solo en [`checklist.md`](checklist.md)**, ordenado por
  sección. Los archivos de `secciones/` no llevan marcas de «pendiente» ni de
  «hecho».
- **Nada inventado.** Cada afirmación sale del repositorio, de los documentos
  de Instrumentación Quirúrgica o de una referencia citada. Una cifra se toma
  del documento que la mantiene (por ejemplo, `sivri/docs/dataset.md` para el
  detector) y se cita con la fecha de la medición.
- **Registro formal**, con los términos ya definidos en el repositorio y en
  el Formato 115. Cada decisión dice quién la tomó y cuándo.
- **Numeración:** tablas en números romanos y figuras en arábigos, por orden
  de aparición; las referencias en estilo IEEE, numeradas por orden de la
  primera cita. Una tabla o figura nueva se escribe con una clave
  («**TABLA [t:clave]. Título**», «*Figura [f:clave]. Pie*») y se cita con
  ella («la Tabla [t:clave]», «la Fig. [f:clave]»); una referencia nueva se
  agrega al final de la lista con el número siguiente. Después se corre, desde
  la raíz del repositorio, `python3 -I tesis/herramientas/numerar.py`, que
  numera y renumera todo y avisa si una referencia no se cita o una clave no
  tiene título.
- **Figuras:** en `figuras/`, en PNG, con un nombre que diga qué muestran
  (`simiq3d-mesa-tiroidectomia.png`) y una fila en
  [`figuras/README.md`](figuras/README.md) con la sección y la fuente.
- **Evidencias:** en `evidencias/`, solo resultados agregados (tablas de
  métricas, CSV del banco de preguntas). No van datos personales, ni el
  registro de conversaciones en crudo, ni las fotos del programa de IQ.

## Lo que este directorio no hace

Este directorio no produce el Formato 115 con su diseño: no tiene la
plantilla, la portada, la tabla de contenido ni las imágenes pegadas. Quien
arma el documento con la plantilla toma el texto, las tablas y las figuras de
aquí, sin cambiar su contenido ni su numeración.

## Espacios para imágenes

Las figuras que ya están en `figuras/` se muestran en el texto con su pie
debajo. Donde todavía falta la imagen hay un bloque así:

> **[Imagen]** Qué captura hay que tomar.
>
> *Fig. N. Pie de figura. Fuente.*

Cuando la imagen exista, se guarda en `figuras/` con su fila en el índice y el
bloque se cambia por `![Pie](../figuras/archivo.png)` con el pie debajo.

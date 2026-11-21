# Tesis (Formato 115)

Este directorio reúne **todo lo que va al trabajo de grado**: el texto nuevo
o corregido de cada sección del Formato 115, las figuras, los resultados de
las evaluaciones y las referencias. Lo trabaja el equipo de Ingeniería de
Sistemas, cada quien en la sección que le toca, con el mismo flujo de PR que
el resto del repositorio. Lo decidió Mauricio el 2026-11-21: el equipo trabaja
en GitHub y el Drive solo guarda el documento entregado en cada corte.

El documento oficial sigue siendo el Formato 115 en Google Drive
(`ENTREGABLES/`, carpeta «Tesis ING-IQ - CURN»). Al cerrar cada corte, el
contenido de este directorio se pasa a esa copia y se entrega desde allí.

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
│   ├── 07-desarrollo/           un archivo por módulo
│   │   ├── dataiq.md
│   │   ├── simiq3d.md
│   │   ├── sivri.md
│   │   └── plataforma.md        lo común: shell, sesión e infraestructura
│   ├── 08-resultados.md
│   ├── 09-discusion.md
│   ├── 10-conclusiones.md
│   ├── 11-recomendaciones.md
│   └── 12-referencias.md
├── anexos/
│   ├── a-b-cortes-anteriores.md lo que ya se entregó en los Cortes 1 y 2
│   ├── c-enlaces.md             enlaces a los productos
│   └── d-tercer-corte.md        registro de avance del tercer corte
├── figuras/                     imágenes listas para el documento, con su índice
└── evidencias/                  resultados exportados de las evaluaciones
```

Cada archivo de `secciones/` tiene tres partes:

1. **Qué lleva:** lo que pide el Formato 115 en esa sección.
2. **Fuentes en el repositorio:** de dónde salen los datos. La tesis cita esos
   documentos; no copia cifras que puedan cambiar.
3. **Texto:** la redacción para el documento, lista para pasarla al Drive.

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
  de aparición; las referencias en estilo IEEE, numeradas por orden de cita.
  La numeración final se fija al pasar el texto al Drive: aquí se nombra la
  tabla o figura por su contenido (por ejemplo, «la tabla de resultados del
  detector»).
- **Figuras:** en `figuras/`, en PNG, con un nombre que diga qué muestran
  (`simiq3d-mesa-tiroidectomia.png`) y una fila en
  [`figuras/README.md`](figuras/README.md) con la sección y la fuente.
- **Evidencias:** en `evidencias/`, solo resultados agregados (tablas de
  métricas, CSV del banco de preguntas). No van datos personales, ni el
  registro de conversaciones en crudo, ni las fotos del programa de IQ.

## Cómo se pasa al Drive

Al cerrar un corte, quien arma la entrega:

1. Revisa en `checklist.md` que no quede nada abierto para ese corte.
2. Copia el texto de cada sección a la copia del Formato 115 del Drive, en el
   mismo orden, y fija la numeración de tablas, figuras y referencias.
3. Inserta las figuras de `figuras/`.
4. Lo registra en el anexo del corte (`anexos/d-tercer-corte.md`).

# Dataset de SIVRI

De dónde salen las imágenes para entrenar y evaluar el modelo, qué
instrumentos reconoce y cómo se mapea cada uno al catálogo de DataIQ
(`instruments.id`).

Las imágenes no se guardan en el repo.

## Fuente: dataset propio

Todas las imágenes son propias: fotos de las mesas de Mayo de Cirugía General
tomadas por el programa de Instrumentación Quirúrgica con su instrumental, sobre
su mesa real. El equipo de ING las etiqueta. El dataset se publica en Kaggle
(decidido por Mauricio el 2026-10-13), así el proyecto controla las imágenes,
sus etiquetas y su división, y otros pueden reutilizarlo.

Por qué propio y no un dataset público: el MVP se limita a cinco mesas, con un
conjunto acotado de instrumentos, y ningún dataset público revisado los cubre
todos ni distingue los parecidos (ver «Fuentes públicas revisadas»).

### Sesiones y división de los datos

Decidido por Mauricio el 2026-10-13: **tres sesiones de fotos**, y la
división se hace por sesión, nunca foto por foto (las fotos de una misma sesión
son casi iguales entre sí; repartidas, el modelo «ya vio» la prueba y las
métricas salen infladas):

| Sesión | Grupo | Para qué | Cuándo |
|---|---|---|---|
| 1 | Entrenamiento | De donde aprende el modelo | Primera visita al laboratorio, en la mañana |
| 2 | Validación | Ajustar cada iteración del entrenamiento y los márgenes de la validación de la mesa (evaluación formativa) | Primera visita, en la tarde |
| 3 | Prueba | Evaluación sumativa de la tesis: no se usa hasta el final | Segunda visita, otro día |

Son dos idas al laboratorio. Lo que hace distinta a cada sesión es que cambien
las condiciones: otra persona armando las mesas, otro celular y, si hay, otra
mesa del laboratorio; la sesión de prueba, además, otro día. SIVRI se usa en el
laboratorio, con su luz, así que no hace falta buscar luces distintas. En cada
sesión aparecen las cinco mesas y todos los instrumentos, para que cada grupo
tenga de todo.

Si solo se consiguen dos sesiones: la segunda es la prueba, y la validación se
saca de la primera, al azar (sale optimista: en la tesis se aclara).

### Cómo se toman las fotos

**Antes de empezar**

- La mesa de Mayo con su campo, como en una práctica, y el instrumental de las
  cinco mesas (lista abajo). Los mangos de bisturí, con su hoja montada como
  van en la mesa.
- **Cuatro marcadores ArUco** impresos y plastificados, uno en cada esquina
  de la mesa, encima del campo. Van en todas las fotos y videos: SIVRI los usa
  para ubicar la cuadrícula. Las mismas tarjetas en las tres sesiones.
- El arreglo de cada técnica de DataIQ a la vista, para armar las mesas.
- Anotar en una hoja: fecha, hora, celular, tipo de luz y quién arma.

**Cómo es cada foto**

- Desde arriba, con el celular más o menos paralelo a la mesa.
- **Toda la mesa en la foto, con sus cuatro bordes y los cuatro
  marcadores**: SIVRI los necesita para ubicar las celdas.
- Sin zoom, sin flash, sin filtros ni edición.
- Sin personas: ni caras ni manos dentro de la foto.
- Si sale movida o desenfocada, se repite.
- Entre una foto y otra de lo mismo, cambiar un poco la altura o la inclinación
  del celular, como lo haría un estudiante.

**Lo que se fotografía en cada sesión**

Las cantidades son un punto de partida; la primera sesión dirá cuánto tiempo
toma y si hace falta ajustarlas.

1. **Las cinco mesas armadas bien**, según DataIQ: unas 5 fotos de cada una.
2. **Las mismas mesas con errores a propósito**, 3 variantes por técnica, 2
   fotos de cada variante. Errores como: dos instrumentos intercambiados, uno
   que falta, uno que sobra, uno girado o fuera de su celda. Cada variante se
   anota en la hoja (qué técnica y qué error), porque es la respuesta correcta
   con la que se evalúa la retroalimentación de SIVRI.
3. **Los instrumentos en grupos de 3 o 4** sobre el campo, cambiando su
   posición, su giro y cuáles van juntos, incluso tocándose un poco como en una
   mesa real: unas 8 fotos por grupo, hasta que cada instrumento haya salido en
   varios grupos.
4. **La mesa vacía**, solo con el campo: unas 3 fotos. Le enseñan al modelo
   que el fondo no es un instrumento (Ultralytics recomienda entre 0 y 10 % de
   imágenes sin objetos).
5. **Un video corto de cada mesa bien armada**, de unos 10 segundos,
   sosteniendo el celular desde arriba como lo haría un estudiante, sin
   recorrer la mesa. SIVRI trabaja con el video de la cámara: estos videos
   traen el temblor de la mano y el desenfoque que las fotos quietas no
   tienen. De cada video se sacan unos 10 cuadros para etiquetar,
   que cuentan como imágenes de la misma sesión.

**Cuántas fotos salen**

Se fotografían 19 instrumentos: los 23 de la lista menos las 4 hojas de
bisturí, que van montadas en su mango. Con las cantidades de arriba:

| Bloque | Cálculo | Fotos por sesión |
|---|---|---|
| Mesas bien armadas | 5 mesas × 5 | 25 |
| Mesas con errores | 5 técnicas × 3 variantes × 2 | 30 |
| Grupos | cada instrumento en unos 3 grupos de 4 → unos 15 grupos × 8 | unas 120 |
| Mesa vacía | | 3 |
| Videos de las mesas | 5 videos × 10 cuadros | 50 |
| **Total** | | **unas 230 imágenes por sesión** |

La sesión 1 es la única de entrenamiento, así que **hace el bloque de grupos
dos veces** (unas 240 fotos de grupos en vez de 120). Con eso:

| Sesión | Imágenes |
|---|---|
| 1 (entrenamiento) | unas 350 |
| 2 (validación) | unas 230 |
| 3 (prueba) | unas 230 |
| **Total** | **unas 800** |

- Por instrumento, en la sesión de entrenamiento: los que están en las cinco
  mesas salen unas 100 veces; los que están en una sola mesa (Kocher, Lahey,
  entre otros), unas 60.
- Es mucho menos de lo que Ultralytics recomienda para resultados óptimos (al
  menos 1500 imágenes por clase). Para un MVP de cinco mesas es un punto de
  partida; la sesión de validación dice si alcanza. Si los instrumentos de una
  sola mesa salen flojos, se les dan más fotos en grupos o se agrega una sesión.
- Etiquetado: unas 5000 cajas (cada imagen de mesa tiene unos 10
  instrumentos).
  Con un primer modelo entrenado, la herramienta de etiquetado puede proponer
  las cajas y solo se corrigen.

**Después**

- Las fotos van a una carpeta por sesión (`sesion-1/`, `sesion-2/`…), con la
  hoja de la sesión.
- El equipo de ING las etiqueta. El programa de IQ no etiqueta.
- La primera sesión se hace con el equipo de ING presente, para ajustar el
  protocolo; las demás las puede hacer el programa de IQ por su cuenta con este
  documento.

### Instrumentos de las cinco mesas de Mayo

Según los arreglos publicados en DataIQ:

| Instrumento | Técnicas (de 5) |
|---|---|
| Pinza de Allis | 5 |
| Pinza de disección con garra | 5 |
| Pinza de disección sin garra | 5 |
| Pinza Rochester | 5 |
| Separador de Farabeuf | 5 |
| Tijera de Mayo | 5 |
| Tijera de Metzenbaum | 5 |
| Mango de bisturí N.° 3 | 4 |
| Mango de bisturí N.° 4 | 4 |
| Pinza Kelly | 4 |
| Hoja de bisturí #20 | 4 |
| Hoja de bisturí #15 | 3 |
| Pinza de Babcock | 2 |
| Hoja de bisturí #10 | 1 |
| Hoja de bisturí #10-11 | 1 |
| Mango de bisturí N.° 7 | 1 |
| Pinza Kelly Adson | 1 |
| Pinza Kocher | 1 |
| Pinza Lahey | 1 |
| Pinza de Moynihan | 1 |
| Pinza Mosquito curva | 1 |
| Portaagujas largo | 1 |
| Separador de Senn Miller | 1 |

Cada clase del modelo es un instrumento del catálogo, así que el mapeo a
`instruments.id` es directo. Ese mapeo vive en la base de datos de SIVRI, no en
DataIQ. Como los ids del catálogo cambian de una instalación a otra, el repo
guarda el mapeo por nombre del instrumento (o un alias) y se traduce a ids en
cada entorno con la API de DataIQ.

## Fuentes públicas revisadas

Revisadas el 2026-10-13 y no usadas:

| Fuente | Qué tiene | Por qué no |
|---|---|---|
| Different Surgical Tools (Roboflow, CC BY 4.0) | 7450 imágenes, 12 clases (Metzenbaum, Mayo, Allis, Babcock, Crile, Lahey, portaagujas, pinza de esponja, bisturí, pinza de disección) | Cubre 5 de los instrumentos de las mesas; no tiene Rochester, Farabeuf ni Kelly, ni distingue disección con o sin garra ni el número del mango. Además junta dos datasets con fondos distintos (el de Coimbra, en blanco y negro sobre bandeja metálica) y su división trae 182 grupos de fotos casi idénticas repartidos entre entrenamiento, validación y prueba |
| SID-RAS (Mendeley, 2025) | 6000 imágenes, 9 clases | Clases genéricas («forceps», «hemostat», «mayo»…); licencia CC BY-ND 4.0, que no permite publicar una versión modificada |
| Labeled Surgical Tools (Coimbra, 2018) | 4 clases sobre bandeja | Ya está dentro de Different Surgical Tools |
| Datasets de laparoscopia (CholecTrack20, Cholec80) | Imágenes del endoscopio | Otro dominio: desde dentro del abdomen |
| Instrumental odontológico (Mendeley) | 22 clases | Ninguna coincide |

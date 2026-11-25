# Dataset de SIVRI

De dónde salen las imágenes para entrenar y evaluar el modelo, qué
instrumentos reconoce y cómo se mapea cada uno al catálogo de DataIQ
(`instruments.id`).

Las imágenes no se guardan en el repo.

## Fuente: dataset propio

Todas las imágenes son propias: fotos de las mesas de Mayo de Cirugía General
tomadas por el programa de Instrumentación Quirúrgica con su instrumental, sobre
su mesa real. El equipo de ING las etiqueta. Se prevé publicar el dataset en Kaggle, así el proyecto controla las imágenes,
sus etiquetas y su división, y otros pueden reutilizarlo.

Por qué propio y no un dataset público: el MVP se limita a cinco mesas, con un
conjunto acotado de instrumentos, y ningún dataset público revisado los cubre
todos ni distingue los parecidos (ver «Fuentes públicas revisadas»).

### Sesiones y división de los datos

**Tres sesiones de fotos**, y la
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

### Captura del 2026-11-18

Las 125 fotos se tomaron en una visita. Se mantuvieron completos los tres
grupos de captura: Ronda 1 (55 fotos, entrenamiento), Ronda 2 (35, validación)
y Ronda 3 (35, prueba del detector). Las tres rondas se tomaron el mismo día.
Las tomas «Bien Armada» de las tres rondas sirvieron para definir la cuadrícula
de DataIQ. La Ronda 3 quedó fuera del entrenamiento y de la selección de
pesos. Sus fotos «Error A» y «Error B» pueden usarse para evaluar la
retroalimentación espacial si IQ confirma el error de cada caso y esas
fotos se reservan del ajuste de umbrales.

La división por ronda no cumple lo planificado en «Sesiones y división de los
datos»: las tres rondas son de la misma visita y del mismo instrumental, no de
sesiones independientes (otro día, otras personas, otro celular). La Ronda 3
sirve como prueba reservada del entrenamiento, pero las métricas pueden ser
más optimistas que las de una sesión nueva. Además, la Ronda 3 se midió con las
tres corridas y la elección de mantener `sivri-r2` se tomó viendo esas
mediciones.

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

La estimación original de captura (2026-10-13) usaba las cantidades de arriba:

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
  mesas salen unas 100 veces; los que están en una sola mesa, unas 60.
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

Los arreglos se documentan en
[DataIQ](../../dataiq/docs/catalogo.md#mesas-de-mayo-de-cirugía-general). La lista
ordenada de las 16 clases y su correspondencia con el catálogo está en
[`classes.csv`](../backend/classes.csv). El 2026-11-21 se corrigieron los
mangos en las 125 fotos, se ampliaron 79 cajas y se etiquetó cada pinza de disección por separado. El dataset tiene
1487 cajas, incluidas 125 de disección con garra y 125 sin garra.

## Resultados del detector YOLO26n

Corrida `sivri-r1` del 2026-11-19. Entrenamiento en CPU durante 120 épocas
con entrada de 640 px. Las cifras corresponden a los pesos `best.pt` elegidos
con la Ronda 2. Cada corrida se evaluó una vez con la Ronda 3.

| Corrida | Grupo | Fotos | Precisión | Exhaustividad | mAP@0.5 | mAP@0.5:0.95 |
|---|---|---:|---:|---:|---:|---:|
| sivri-r1 | Validación | 35 | 0,781 | 0,834 | 0,862 | 0,616 |
| sivri-r1 | Prueba | 35 | 0,861 | 0,843 | 0,889 | 0,628 |
| sivri-r2 | Validación | 35 | 0,801 | 0,874 | 0,900 | 0,635 |
| sivri-r2 | Prueba | 35 | 0,794 | 0,862 | 0,887 | 0,614 |
| sivri-r3 | Validación | 35 | 0,832 | 0,854 | 0,892 | 0,628 |
| sivri-r3 | Prueba | 35 | 0,829 | 0,821 | 0,885 | 0,606 |

La corrida `sivri-r2` del 2026-11-21 partió de YOLO26n preentrenado, con
la misma receta durante 120 épocas. Se seleccionaron los pesos con Ronda 2
y se tomó una única medición final del detector por corrida en Ronda 3.
El cambio de etiquetas y de número de clases afecta la comparación global.

La corrida `sivri-r3` del 2026-11-23 repitió la receta de `sivri-r2` después de
revisar las etiquetas de la Pinza Kelly en las rondas 1 y 2 (una caja por
pinza cuando las dos se distinguen en la foto; 17 fotos cambiaron). No mejoró
a `sivri-r2` en la Ronda 3: más precisión, menos exhaustividad y el mismo
mAP@0.5. Por clase, mejoraron la Kocher (AP@0.5 de 0,752 a 0,881) y el Senn
Miller, y empeoraron la Moynihan (0,917 a 0,755) y la Kelly (0,666 a 0,632);
las etiquetas de la Kelly de la Ronda 3 no se revisaron, así que esa
comparación no es pareja. Se decidió mantener
`sivri-r2`. La validación de la Ronda 2 también cambió de etiquetas, por lo
que tampoco es pareja.

### Validación por clase

| Clase | mAP@0.5 | mAP@0.5:0.95 |
|---|---:|---:|
| Mango de bisturí N.° 3 | 0,994 | 0,612 |
| Mango de bisturí N.° 4 | 0,995 | 0,572 |
| Tijera de Metzenbaum | 0,964 | 0,616 |
| Tijera de Mayo | 0,983 | 0,778 |
| Pinza de disección | 0,995 | 0,612 |
| Separador de Farabeuf | 0,989 | 0,614 |
| Pinza Kelly | 0,860 | 0,639 |
| Pinza Mosquito | 0,399 | 0,312 |
| Pinza de Allis | 0,977 | 0,779 |
| Pinza de Babcock | 0,874 | 0,626 |
| Pinza de Moynihan | 0,734 | 0,661 |
| Pinza Kelly Adson | 0,788 | 0,622 |
| Pinza Rochester | 0,877 | 0,672 |
| Pinza Kocher | 0,617 | 0,472 |
| Separador de Senn Miller | 0,887 | 0,649 |

### Resultados por clase de sivri-r2

La tabla previa conserva los nombres publicados en r1. Los dos mangos
estaban intercambiados en aquella corrida y la disección era una sola clase.

| Clase | AP50 validación | AP50:95 validación | AP50 prueba | AP50:95 prueba |
|---|---:|---:|---:|---:|
| Mango de bisturí N.° 3 | 0,979 | 0,544 | 0,959 | 0,577 |
| Mango de bisturí N.° 4 | 0,990 | 0,588 | 0,954 | 0,541 |
| Tijera de Metzenbaum | 0,991 | 0,687 | 0,896 | 0,672 |
| Tijera de Mayo | 0,975 | 0,771 | 0,987 | 0,674 |
| Pinza de disección con garra | 0,950 | 0,530 | 0,956 | 0,551 |
| Separador de Farabeuf | 0,989 | 0,655 | 0,993 | 0,778 |
| Pinza Kelly | 0,773 | 0,580 | 0,666 | 0,494 |
| Pinza Mosquito | 0,608 | 0,455 | 0,855 | 0,704 |
| Pinza de Allis | 0,981 | 0,774 | 0,942 | 0,738 |
| Pinza de Babcock | 0,818 | 0,599 | 0,813 | 0,588 |
| Pinza de Moynihan | 0,611 | 0,561 | 0,917 | 0,622 |
| Pinza Kelly Adson | 0,995 | 0,858 | 0,725 | 0,497 |
| Pinza Rochester | 0,943 | 0,743 | 0,913 | 0,627 |
| Pinza Kocher | 0,913 | 0,672 | 0,752 | 0,570 |
| Separador de Senn Miller | 0,924 | 0,639 | 0,933 | 0,675 |
| Pinza de disección sin garra | 0,957 | 0,510 | 0,931 | 0,524 |

## Fuentes públicas revisadas

Revisadas el 2026-10-13 y no usadas:

| Fuente | Qué tiene | Por qué no |
|---|---|---|
| Different Surgical Tools (Roboflow, CC BY 4.0) | 7450 imágenes, 12 clases (Metzenbaum, Mayo, Allis, Babcock, Crile, Lahey, portaagujas, pinza de esponja, bisturí, pinza de disección) | Cubre 5 de los instrumentos de las mesas; no tiene Rochester, Farabeuf ni Kelly, ni distingue disección con o sin garra ni el número del mango. Además junta dos datasets con fondos distintos (el de Coimbra, en blanco y negro sobre bandeja metálica) y su división trae 182 grupos de fotos casi idénticas repartidos entre entrenamiento, validación y prueba |
| SID-RAS (Mendeley, 2025) | 6000 imágenes, 9 clases | Clases genéricas («forceps», «hemostat», «mayo»…); licencia CC BY-ND 4.0, que no permite publicar una versión modificada |
| Labeled Surgical Tools (Coimbra, 2018) | 4 clases sobre bandeja | Ya está dentro de Different Surgical Tools |
| Datasets de laparoscopia (CholecTrack20, Cholec80) | Imágenes del endoscopio | Otro dominio: desde dentro del abdomen |
| Instrumental odontológico (Mendeley) | 22 clases | Ninguna coincide |

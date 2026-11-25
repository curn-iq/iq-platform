# Diagnósticos de SIVRI

Las mediciones hechas durante el desarrollo, en orden. Las métricas del detector
sobre la Ronda 3 están en [`dataset.md`](dataset.md). Las fotos «Bien armada»
sirvieron para definir las celdas, y los errores puestos en las mesas A y B no
tienen confirmación de IQ: estas cifras describen la concordancia con esas
fotos, no una prueba independiente.

## Ensayo local del WebSocket

2026-11-19, en local, con YOLO26n en CPU: tres fotos de Colecistectomía de la
Ronda 3, un cuadro por vez y hasta tres por segundo. Sin contar el primero, las
12 respuestas tardaron una mediana de 79,7 ms (de 64,1 a 92,1 ms). En las tres se
detectaron los cuatro marcadores y Colecistectomía quedó primera.

## Vista previa en el Servidor PC1

2026-11-19, por la dirección pública de Tailscale Funnel: una conexión procesó 25
cuadros en 316,4 s, renovó el token en la misma conexión y, en una conexión
nueva, rechazó el token vencido (código 4401). Con un JPEG de 478,9 kB, la
mediana después del primer cuadro fue de 1,10 s. En seis fotos de la Ronda 3 se
detectaron los cuatro marcadores y la técnica correcta quedó primera.

## Tamaño del cuadro por Funnel

Desde el Servidor PC1 contra la dirección pública de Funnel, con una foto de
Mastectomía Error A, seis cuadros de cada tamaño con calidad JPEG 75:

| Lado mayor | Tamaño por cuadro | Mediana envío–respuesta |
|---:|---:|---:|
| 960 px | 90,4 kB | 294 ms |
| 640 px | 45,4 kB | 248 ms |

En los dos tamaños se indicó mover Kelly y Farabeuf. La app manda 640 px.

## Diagnóstico de la retroalimentación

Las 35 fotos de la Ronda 2 y las 35 de la Ronda 3, comparando lo que dice el
validador con los centros de YOLO y con los de las cajas anotadas (técnica fija).
Se detectaron los cuatro marcadores en 31 fotos de la Ronda 2 y en 33 de la Ronda 3.

| Foto de la Ronda 3 | Con YOLO26n | Con las cajas anotadas |
|---|---|---|
| Colecistectomía bien armada | Pide mover la Allis | En su celda, cerca del borde |
| Eventrorrafia Error A | Da por bien ubicadas Metzenbaum y Kelly Adson | Pide mover ambas |
| Eventrorrafia Error B | Dice que faltan Kelly y Allis | Pide mover ambas |
| Mastectomía Error A | Pide mover Kelly y Farabeuf | Pide mover ambas |

Ampliar el margen de 0,10 a 0,20 casi no cambió los avisos; se conservó 0,10.

## Con 16 clases (2026-11-22)

Rondas 2 y 3 con `sivri-r2`, confianza 0,35 y margen de 0,10:

| Ronda | Con cuatro marcadores | Técnica correcta primera | Entre las mostradas | «Bien armada» con algún aviso |
|---|---:|---:|---:|---:|
| 2 | 31/35 | 26/31 | 27/31 | 13/13 |
| 3 | 33/35 | 24/33 | 26/33 | 10/13 |

## Celdas recalculadas con las tres rondas (2026-11-23)

Las celdas se recalcularon con las cajas anotadas de las 42 fotos «Bien armada»
con los cuatro marcadores (466 centros). Indicaciones de mover que daría SIVRI
con las cajas anotadas:

| Técnica | Celdas anteriores | Celdas recalculadas |
|---|---:|---:|
| Colecistectomía | 15 | 6 |
| Eventrorrafia | 15 | 3 |
| Hemicolectomía derecha | 10 | 6 |
| Mastectomía | 6 | 3 |
| Tiroidectomía | 3 | 0 |
| **Total** | **49** | **18** |

Cambiaron las celdas de 19 de los 57 objetos. Las 18 que quedan son de rondas en
que el programa de IQ invirtió el orden de dos piezas, que ninguna celda fija
cubre.

## Con las celdas recalculadas (2026-11-23)

Las mismas 70 fotos, con las celdas nuevas y el reconocimiento que descuenta lo
que sobra. Cada flecha va del 2026-11-22 al 2026-11-23:

| Ronda | Técnica correcta primera con YOLO | Dos técnicas mostradas con YOLO | Técnica correcta primera con cajas anotadas |
|---|---:|---:|---:|
| 2 | 26 → 30 | 6 → 3 | 27 → 31 |
| 3 | 24 → 30 | 2 → 3 | 33 → 33 |
| **Total** | **50 → 60** | **8 → 6** | **60 → 64** |

En las 26 fotos «Bien armada» evaluables, los avisos de mover bajaron de 24 a 6
con YOLO (de 38 a 7 con las cajas anotadas) y los 45 faltantes de YOLO no
cambiaron: 21 eran de las pinzas de disección.

## Umbral de confianza por instrumento (2026-11-23)

`sivri-r2` ve las pinzas de disección con confianza baja. Cada instrumento puede
tener su propio umbral (`CLASS_CONFIDENCE`), elegido en la Ronda 2: 0,11 para la
pinza de disección sin garra, 0,17 para la con garra, 0,28 para el mango de
bisturí N.° 3 y 0,33 para la Kelly Adson. Comparado con el umbral único de 0,35:

| Ronda | Faltantes con YOLO | «Bien armada» con algún aviso | Sobrantes | Técnica correcta primera |
|---|---:|---:|---:|---:|
| 2 (donde se eligieron) | 25 → 9 | 13 → 10 de 13 | 3 → 3 | 30 → 30 de 31 |
| 3 (prueba) | 20 → 15 | 10 → 8 de 13 | 0 → 0 | 30 → 30 de 33 |

Los faltantes de las pinzas de disección pasaron de 21 a 2. Los que quedan son
errores de clase (el mango N.° 3 visto como N.° 4, la Kelly Adson como
Rochester), que un umbral no corrige. Al cambiar los pesos se vuelven a medir.

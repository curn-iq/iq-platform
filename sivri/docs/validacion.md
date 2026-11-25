# Cómo valida SIVRI la mesa

Qué es una mesa correcta, cómo se compara con la de DataIQ y con qué valores de
partida. El código está en `backend/app/domain/validation.py`.

## Cómo se usa

1. El estudiante abre SIVRI y apunta la cámara a la mesa, desde arriba, con los
   cuatro marcadores a la vista.
2. **Mientras arma**, SIVRI solo nombra lo que ve: sobre cada instrumento, su
   nombre. No valida nada todavía.
3. **Cuando la mesa está armada**, la compara con las cinco técnicas y muestra la
   que más se parece, con su porcentaje («Mastectomía · 90 %»), qué está en su
   lugar y qué mover y a dónde («Pinza Kelly (n.º 2): va en el centro, a la
   derecha, junto a Pinza Rochester (n.º 3)»). Si dos técnicas quedan muy cerca,
   muestra las dos. El estudiante no elige la técnica: SIVRI la reconoce.

## Qué es una mesa correcta

- **Celda exacta.** Cada instrumento va en su celda del arreglo de DataIQ; si
  no, SIVRI dice dónde va. Importa la posición, no la cantidad. La celda es una
  medida interna: al estudiante se le habla de la zona de la mesa, lo que tiene
  al lado y el número del diagrama de IQ.
- **De dónde salen las celdas.** De las fotos «Bien armada» de las tres rondas:
  cada instrumento suma las celdas vecinas donde el programa de IQ también lo
  puso, y una celda en disputa es del que más veces cae allí.
- **Margen técnico.** Un instrumento justo en el borde entre dos celdas no se
  marca como error: puede ser imprecisión de la medición.
- **Marcadores en las esquinas.** Cuatro marcadores ArUco dan la posición exacta
  de la mesa en cada cuadro y, con ella, la cuadrícula.

El arreglo se toma del
[catálogo de DataIQ](../../dataiq/docs/catalogo.md#mesas-de-mayo-de-cirugía-general).

## Cómo se valida la mesa

Como los sistemas que verifican bandejas de instrumental o estanterías
(«planogram compliance»): detectar, emparejar y dar un estado a cada objeto.
Para cada técnica, con su propia cuadrícula:

1. **Emparejar** cada detección con una posición esperada de la misma clase
   (algoritmo húngaro). Entre copias, gana la que cae en su celda. Un
   instrumento ajeno a la técnica da un solo aviso de sobrante.
2. **Medir** dónde cae el **centro** de la caja respecto de sus celdas: un
   instrumento bien puesto suele sobresalir hacia las vecinas, así que la caja
   entera no sirve.
3. **Dar un estado:**

   | Estado | Cuándo | Qué ve el estudiante |
   |---|---|---|
   | En su lugar | El centro cae en sus celdas | Marcado como correcto |
   | Mover | El centro cae en otra celda | Dónde va |
   | Dudoso | El centro cae en el margen técnico | Nada |
   | Falta | Se esperaba y no aparece | Qué falta y dónde va |
   | Sobra | Aparece y no se esperaba | Qué sobra |

4. **Porcentaje:** instrumentos en su lugar (y dudosos) sobre los esperados.
5. **Qué técnica es:** la que más se parece, contando también lo que sobra para
   ella; así una técnica con menos piezas no empata con la que está armada.

Esta lógica se evalúa con las mesas armadas con errores a propósito: cuántos
errores reales detecta, cuántos de los que reporta son reales y en cuántas mesas
reconoce bien la técnica.

## Puntos de partida

Valores con que se implementó y que se ajustan con las fotos de validación
(`app/config.py`):

| Valor | Punto de partida |
|---|---|
| La mesa | Entre los centros de los cuatro marcadores (0 arriba a la izquierda, en el sentido de las agujas del reloj; diccionario 4x4 de 50), ampliada un 10 % por lado (`BOARD_PADDING`) |
| Margen técnico | 10 % del lado de la celda (`CELL_MARGIN`); un objeto de varias celdas no tiene margen entre ellas |
| Muy cerca | Dos técnicas a 5 puntos o menos (`CLOSE_GAP`) |
| Confianza del detector | 0,35 (`CONFIDENCE`), con umbrales propios para algunos instrumentos (`CLASS_CONFIDENCE`; ver [`diagnosticos.md`](diagnosticos.md#umbral-de-confianza-por-instrumento-2026-11-23)) |
| Qué se espera | Un instrumento por componente de cada objeto, si es clase del detector |

El backend siempre valida y devuelve el porcentaje; la app decide qué mostrar
mientras se arma y cuándo mostrar la técnica.

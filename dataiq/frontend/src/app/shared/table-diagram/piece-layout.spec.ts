import { CELL, NUMBER_RADIUS, numberPosition, numberScale } from './piece-layout';

describe('numberPosition', () => {
  it('un objeto de una celda lleva su número en la esquina inferior derecha', () => {
    // celda (fila 2, columna 3): ocupa x 200–300, y 100–200
    expect(numberPosition([{ row: 2, column: 3 }])).toEqual({ x: 282, y: 182 });
  });

  it('dos celdas en fila: el número queda sobre la línea que las une, centrado', () => {
    // centros (150, 150) y (250, 150): punto medio (200, 150), 37 por encima
    const position = numberPosition([
      { row: 2, column: 2 },
      { row: 2, column: 3 },
    ]);
    expect(position.x).toBeCloseTo(200);
    expect(position.y).toBeCloseTo(113);
  });

  it('dos celdas en columna: el número queda a la derecha', () => {
    const position = numberPosition([
      { row: 2, column: 2 },
      { row: 3, column: 2 },
    ]);
    expect(position.x).toBeCloseTo(187);
    expect(position.y).toBeCloseTo(200);
  });

  it('dos celdas en diagonal descendente (como la pinza de campo de la reserva)', () => {
    // celdas (4, 2) y (5, 1): centros (150, 350) y (50, 450)
    const position = numberPosition([
      { row: 4, column: 2 },
      { row: 5, column: 1 },
    ]);
    // punto medio (100, 400), desplazado 37 en diagonal hacia abajo y a la derecha
    expect(position.x).toBeCloseTo(100 + 37 * Math.SQRT1_2);
    expect(position.y).toBeCloseTo(400 + 37 * Math.SQRT1_2);
  });

  it('no depende del orden en que lleguen las celdas', () => {
    const forward = numberPosition([
      { row: 4, column: 2 },
      { row: 5, column: 1 },
    ]);
    const backward = numberPosition([
      { row: 5, column: 1 },
      { row: 4, column: 2 },
    ]);
    expect(backward.x).toBeCloseTo(forward.x);
    expect(backward.y).toBeCloseTo(forward.y);
  });

  it('con más de dos celdas toma la primera y la última', () => {
    const three = numberPosition([
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 1, column: 3 },
    ]);
    const ends = numberPosition([
      { row: 1, column: 1 },
      { row: 1, column: 3 },
    ]);
    expect(three).toEqual(ends);
  });
});

describe('numberScale', () => {
  it('deja el círculo del mismo tamaño en pantalla a cualquier ancho', () => {
    // dibujo de 500 unidades: a 500 px cada unidad es 1 px, así que el círculo ya mide NUMBER_RADIUS
    expect(numberScale(500, 500)).toBeCloseTo(11 / NUMBER_RADIUS);
    // a la mitad del ancho el dibujo se achica a la mitad, y el número se agranda al doble
    expect(numberScale(250, 500)).toBeCloseTo(22 / NUMBER_RADIUS);
  });

  it('sin ancho medido (aún no se dibuja) no escala', () => {
    expect(numberScale(0, 500)).toBe(1);
  });

  it('una celda mide 100 unidades', () => {
    expect(CELL).toBe(100);
  });
});

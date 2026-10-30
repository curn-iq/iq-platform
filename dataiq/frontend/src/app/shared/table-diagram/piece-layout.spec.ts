import { CELL, NUMBER_RADIUS, numberPosition, numberScale, placeShapes } from './piece-layout';

describe('placeShapes', () => {
  const kelly = { kind: 'steel', key: 'kelly' } as const;
  const energy = { kind: 'steel', key: 'energy' } as const;
  const gown = { kind: 'flat', key: 'drapePack' } as const;
  const unknown = { kind: 'unknown', key: null } as const;

  it('un instrumento en una celda va al centro, inclinado 40°, a su escala', () => {
    // celda (fila 2, columna 3): origen (200, 100). Kelly escala .85: 1,2 × .85 = 1,02 y 1,02 × 1,15 = 1,173
    const [placed] = placeShapes([{ row: 2, column: 3 }], [kelly]);
    expect(placed).toMatchObject({ kind: 'steel', key: 'kelly' });
    expect(placed.transform).toBe(
      'translate(254 154) rotate(40) translate(0 0) scale(1.173 1.02) translate(0 -50)',
    );
  });

  it('un objeto plano va centrado en su celda, sin girar', () => {
    const [placed] = placeShapes([{ row: 1, column: 1 }], [gown]);
    expect(placed).toMatchObject({ kind: 'flat', key: 'drapePack', transform: 'translate(50 50)' });
  });

  it('un plano con un instrumento: el plano al centro y el instrumento encima, más chico', () => {
    const [flat, steel] = placeShapes([{ row: 1, column: 1 }], [kelly, gown]);
    expect(flat.key).toBe('drapePack');
    expect(flat.transform).toBe('translate(50 50)');
    expect(steel.key).toBe('kelly');
    expect(steel.transform).toBe(
      'translate(44 56) rotate(40) translate(0 0) scale(0.851 0.74) translate(0 -50)',
    );
  });

  it('dos instrumentos en una celda se reparten a los lados del centro', () => {
    const [left, right] = placeShapes([{ row: 1, column: 1 }], [kelly, energy]);
    expect(left.transform).toBe(
      'translate(50 50) rotate(40) translate(-12 0) scale(0.943 0.82) translate(0 -50)',
    );
    expect(right.transform).toBe(
      'translate(50 50) rotate(40) translate(12 0) scale(0.943 0.82) translate(0 -50)',
    );
  });

  it('lo plano y lo punteado se dibujan antes que el acero, para que el acero quede encima', () => {
    const placed = placeShapes([{ row: 1, column: 1 }], [kelly, unknown, gown]);
    expect(placed.map((shape) => shape.kind)).toEqual(['unknown', 'flat', 'steel']);
  });

  it('lo que no tiene dibujo es un recuadro punteado en el centro de la celda', () => {
    const [placed] = placeShapes([{ row: 3, column: 2 }], [unknown]);
    expect(placed).toMatchObject({
      kind: 'unknown',
      transform: 'translate(150 250) rotate(0)',
      width: 68,
      height: 68,
    });
  });

  it('un objeto en dos celdas es un solo instrumento a lo largo de la línea que las une', () => {
    // celdas (4, 2) y (5, 1): centros (150, 350) y (50, 450); punto medio (100, 400); 45° en diagonal
    const [placed] = placeShapes(
      [
        { row: 4, column: 2 },
        { row: 5, column: 1 },
      ],
      [{ kind: 'steel', key: 'towelClamp' }],
    );
    expect(placed.transform).toContain('translate(100 400) rotate(45)');
    // el largo (141,4) × .85 / 100 = 1,202 y × 1,15 = 1,382
    expect(placed.transform).toContain('scale(1.382 1.202)');
  });

  it('en dos celdas contiguas en fila el instrumento queda horizontal', () => {
    const [placed] = placeShapes(
      [
        { row: 2, column: 2 },
        { row: 2, column: 3 },
      ],
      [{ kind: 'steel', key: 'towelClamp' }],
    );
    expect(placed.transform).toContain('translate(200 150) rotate(-90)');
  });

  it('en varias celdas lo punteado abarca el largo entero, girado como la línea', () => {
    const [placed] = placeShapes(
      [
        { row: 2, column: 2 },
        { row: 2, column: 3 },
      ],
      [unknown],
    );
    expect(placed).toMatchObject({ kind: 'unknown', transform: 'translate(200 150) rotate(-90)' });
    // 100 entre los centros + 68 de cada lado de los extremos… el recuadro mide largo + ancho
    expect(placed.height).toBe(168);
    expect(placed.width).toBe(68);
  });

  it('lo plano en varias celdas queda en el punto medio, sin girar', () => {
    const [placed] = placeShapes(
      [
        { row: 1, column: 1 },
        { row: 1, column: 2 },
      ],
      [gown],
    );
    expect(placed.transform).toBe('translate(100 50)');
  });
});

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

import { boxToRect, coverLayout, isVisible, moveDirection, pointToPixels } from './geometry';
import { ALL_MARKERS } from './testing';

describe('coverLayout', () => {
  it('con la misma proporción, el cuadro llena el contenedor', () => {
    expect(coverLayout({ width: 640, height: 480 }, { width: 320, height: 240 })).toEqual({
      left: 0,
      top: 0,
      width: 320,
      height: 240,
    });
  });

  it('un cuadro horizontal en un contenedor vertical se recorta por los lados', () => {
    // 640×480 en 300×400: se agranda a 400 de alto (533 de ancho) y sobran 116,7 px por lado
    const layout = coverLayout({ width: 640, height: 480 }, { width: 300, height: 400 });
    expect(layout.height).toBeCloseTo(400);
    expect(layout.width).toBeCloseTo(533.33);
    expect(layout.top).toBeCloseTo(0);
    expect(layout.left).toBeCloseTo(-116.67);
  });

  it('un cuadro vertical en un contenedor horizontal se recorta arriba y abajo', () => {
    const layout = coverLayout({ width: 480, height: 640 }, { width: 400, height: 300 });
    expect(layout.width).toBeCloseTo(400);
    expect(layout.height).toBeCloseTo(533.33);
    expect(layout.left).toBeCloseTo(0);
    expect(layout.top).toBeCloseTo(-116.67);
  });
});

describe('boxToRect y pointToPixels', () => {
  const layout = coverLayout({ width: 640, height: 480 }, { width: 300, height: 400 });

  it('cuentan el recorte: el centro del cuadro es el centro del contenedor', () => {
    const center = pointToPixels({ x: 0.5, y: 0.5 }, layout);
    expect(center.x).toBeCloseTo(150);
    expect(center.y).toBeCloseTo(200);
  });

  it('pasa una caja en fracciones a píxeles del contenedor', () => {
    const rect = boxToRect({ x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.5 }, layout);
    expect(rect.left).toBeCloseTo(-116.67 + 0.25 * 533.33);
    expect(rect.top).toBeCloseTo(100);
    expect(rect.width).toBeCloseTo(266.67);
    expect(rect.height).toBeCloseTo(100);
  });
});

describe('isVisible', () => {
  const container = { width: 300, height: 400 };

  it('lo que cae del todo en el recorte no se dibuja', () => {
    expect(isVisible({ left: -50, top: 10, width: 40, height: 20 }, container)).toBe(false);
    expect(isVisible({ left: 310, top: 10, width: 40, height: 20 }, container)).toBe(false);
  });

  it('lo que asoma en el borde sí', () => {
    expect(isVisible({ left: -20, top: 10, width: 40, height: 20 }, container)).toBe(true);
    expect(isVisible({ left: 100, top: 100, width: 10, height: 10 }, container)).toBe(true);
  });
});

describe('moveDirection', () => {
  it('sin movimiento no hay flecha', () => {
    expect(moveDirection(null)).toBeNull();
    expect(moveDirection({ rows: 0, columns: 0 })).toBeNull();
  });

  it('una columna a la derecha apunta a la derecha; una fila abajo, hacia abajo', () => {
    expect(moveDirection({ rows: 0, columns: 1 }, ALL_MARKERS)).toEqual({ x: 1, y: 0 });
    expect(moveDirection({ rows: 2, columns: 0 })).toEqual({ x: 0, y: 1 });
  });

  it('negativos van hacia arriba y hacia la izquierda; la diagonal queda unitaria', () => {
    const direction = moveDirection({ rows: -1, columns: -1 })!;
    expect(direction.x).toBeCloseTo(-Math.SQRT1_2);
    expect(direction.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it('con la mesa girada en el cuadro, la flecha gira con ella', () => {
    const rotated = [
      { id: 0, x: 0.9, y: 0.1 },
      { id: 1, x: 0.9, y: 0.9 },
      { id: 2, x: 0.1, y: 0.9 },
      { id: 3, x: 0.1, y: 0.1 },
    ];
    // «Una columna a la derecha» de la mesa es hacia abajo en el cuadro
    const direction = moveDirection({ rows: 0, columns: 1 }, rotated)!;
    expect(direction.x).toBeCloseTo(0);
    expect(direction.y).toBeCloseTo(1);
  });
});

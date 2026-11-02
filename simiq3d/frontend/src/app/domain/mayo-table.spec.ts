import { cellCenter, itemCenter, MAYO_TABLE_SIZE } from './mayo-table';

describe('la mesa de Mayo en metros', () => {
  // Una cuadrícula de 4 filas y 7 columnas sobre la mesa provisional de 56 × 40 cm:
  // cada celda mide 8 × 10 cm.
  const table = { rows: 4, columns: 7 };

  it('la mesa provisional mide 56 × 40 cm, la misma para todas las técnicas', () => {
    expect(MAYO_TABLE_SIZE).toEqual({ width: 0.56, depth: 0.4 });
  });

  it('la fila 1 y la columna 1 son la esquina del fondo a la izquierda', () => {
    const point = cellCenter(table, { row: 1, column: 1 });
    expect(point.x).toBeCloseTo(-0.24);
    expect(point.z).toBeCloseTo(-0.15);
  });

  it('la última fila y la última columna son la esquina de adelante a la derecha', () => {
    const point = cellCenter(table, { row: 4, column: 7 });
    expect(point.x).toBeCloseTo(0.24);
    expect(point.z).toBeCloseTo(0.15);
  });

  it('la celda del medio de una cuadrícula impar queda en el centro de la mesa', () => {
    const point = cellCenter({ rows: 3, columns: 5 }, { row: 2, column: 3 });
    expect(point.x).toBeCloseTo(0);
    expect(point.z).toBeCloseTo(0);
  });

  it('un objeto en varias celdas va al centro de todas', () => {
    const point = itemCenter(table, [
      { row: 1, column: 1 },
      { row: 1, column: 2 },
    ]);
    expect(point?.x).toBeCloseTo(-0.2);
    expect(point?.z).toBeCloseTo(-0.15);
  });

  it('un objeto sin celdas no tiene lugar: la fuente no lo dice', () => {
    expect(itemCenter(table, [])).toBeNull();
  });
});

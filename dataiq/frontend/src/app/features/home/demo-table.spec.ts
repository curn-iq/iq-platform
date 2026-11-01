import { shapesFor } from '../../shared/table-diagram/shape-catalog';
import { DEMO_DETECTIONS, DEMO_SIZE, DEMO_TABLE, MISPLACED_NUMBER } from './demo-table';

describe('DEMO_TABLE', () => {
  it('tiene diez piezas, numeradas del 1 al 10', () => {
    expect(DEMO_TABLE.items.map((item) => item.legendNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it('no es de ninguna técnica: su nombre dice que es de ejemplo', () => {
    expect(DEMO_TABLE.name).toBe('Mesa de Mayo de ejemplo');
  });

  it('cada pieza ocupa una celda de la mesa y ninguna comparte celda', () => {
    const cells = DEMO_TABLE.items.map((item) => {
      expect(item.cells.length).toBe(1);
      const { row, column } = item.cells[0];
      expect(row).toBeGreaterThanOrEqual(1);
      expect(row).toBeLessThanOrEqual(DEMO_SIZE);
      expect(column).toBeGreaterThanOrEqual(1);
      expect(column).toBeLessThanOrEqual(DEMO_SIZE);
      return `${row},${column}`;
    });
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('cada pieza toma un dibujo de acero: la mesa no usa recuadros punteados', () => {
    for (const item of DEMO_TABLE.items) {
      const shapes = shapesFor(item.instruments);
      expect(shapes.length, item.name).toBe(1);
      expect(shapes[0].kind, item.name).toBe('steel');
    }
  });

  it('un objeto compuesto es uno solo, con su nombre unido con «y»', () => {
    expect(DEMO_TABLE.items[0].name).toBe('Mango de bisturí N.° 3 y Hoja de bisturí #15');
  });

  it('la celda a la derecha de la pieza que se corre está libre', () => {
    const misplaced = DEMO_TABLE.items.find((item) => item.legendNumber === MISPLACED_NUMBER)!;
    const { row, column } = misplaced.cells[0];
    const taken = DEMO_TABLE.items.some(
      (item) => item.cells[0].row === row && item.cells[0].column === column + 1,
    );
    expect(column + 1).toBeLessThanOrEqual(DEMO_SIZE);
    expect(taken).toBe(false);
  });

  it('cada pieza tiene su etiqueta de detección', () => {
    expect([...DEMO_DETECTIONS.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(DEMO_DETECTIONS.get(6)).toEqual({ short: 'Senn Miller', confidence: '0,91' });
  });
});

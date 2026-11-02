import { arrange, EDGE_MARGIN, Footprint, PIECE_GAP } from './arrangement';
import { MAYO_TABLE_SIZE } from './mayo-table';

describe('arrange', () => {
  // Una pinza de 15 cm de largo y 3 cm de ancho
  const piece = (x: number, z: number): Footprint => ({
    x,
    z,
    halfLength: 0.075,
    halfWidth: 0.015,
  });
  const overlaps = (a: Footprint, b: Footprint) =>
    Math.abs(a.x - b.x) < a.halfLength + b.halfLength &&
    Math.abs(a.z - b.z) < a.halfWidth + b.halfWidth;

  it('una pieza que no se sale ni tapa a otra se queda en el centro de su celda', () => {
    expect(arrange([piece(0, 0)])).toEqual([{ x: 0, z: 0 }]);
  });

  it('una pieza que se saldría por el borde se corre lo justo para quedar dentro', () => {
    const [point] = arrange([piece(-0.24, 0)]);
    expect(point.x).toBeCloseTo(-MAYO_TABLE_SIZE.width / 2 + EDGE_MARGIN + 0.075);
    expect(point.z).toBe(0);
  });

  it('dos piezas de la misma fila que se tapan se separan a lo ancho y siguen en su orden', () => {
    const pieces = [piece(-0.04, 0), piece(0.04, 0)];
    const [a, b] = arrange(pieces);
    expect(overlaps({ ...pieces[0], ...a }, { ...pieces[1], ...b })).toBe(false);
    expect(b.z - a.z).toBeCloseTo(0.03 + PIECE_GAP);
    // Solo se corren a lo ancho, y no se cruzan de lado
    expect(a.x).toBeCloseTo(-0.04);
    expect(b.x).toBeCloseTo(0.04);
  });

  it('en el borde, la que no se puede correr se queda y la otra se aparta', () => {
    const limit = MAYO_TABLE_SIZE.depth / 2 - EDGE_MARGIN - 0.015;
    const pieces = [piece(0, -limit), piece(0.02, -limit)];
    const [a, b] = arrange(pieces);
    expect(a.z).toBeGreaterThanOrEqual(-limit - 1e-9);
    expect(b.z).toBeGreaterThanOrEqual(-limit - 1e-9);
    expect(overlaps({ ...pieces[0], ...a }, { ...pieces[1], ...b })).toBe(false);
  });

  it('piezas que ya no se tocan no se mueven', () => {
    const pieces = [piece(-0.1, -0.1), piece(0.1, 0.1)];
    expect(arrange(pieces)).toEqual([
      { x: -0.1, z: -0.1 },
      { x: 0.1, z: 0.1 },
    ]);
  });
});

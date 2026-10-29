import type { ZoneLayout } from './api/models';
import { toTables } from './tables';

const MAYO: ZoneLayout = {
  zone_id: 'z-mayo',
  zone: 'Mesa de Mayo',
  used: true,
  rows: 7,
  columns: 5,
};
const RESERVE: ZoneLayout = {
  zone_id: 'z-reserva',
  zone: 'Mesa de reserva',
  used: true,
  rows: 6,
  columns: 8,
};

describe('toTables', () => {
  it('arma una mesa por cada mesa que la versión lleva, con su tamaño', () => {
    expect(toTables([MAYO, RESERVE])).toEqual([
      { zoneId: 'z-mayo', name: 'Mesa de Mayo', rows: 7, columns: 5 },
      { zoneId: 'z-reserva', name: 'Mesa de reserva', rows: 6, columns: 8 },
    ]);
  });

  it('deja fuera la mesa que la técnica no lleva (used: false)', () => {
    const notUsed: ZoneLayout = { ...RESERVE, used: false, rows: null, columns: null };
    expect(toTables([MAYO, notUsed]).map((table) => table.zoneId)).toEqual(['z-mayo']);
  });

  it('deja fuera una mesa usada a la que le falta el tamaño, en vez de inventarlo', () => {
    const noSize: ZoneLayout = { ...RESERVE, rows: null };
    expect(toTables([noSize])).toEqual([]);
  });

  it('sin mesas no hay nada que dibujar', () => {
    expect(toTables([])).toEqual([]);
  });
});

import type { TechniqueItem, ZoneLayout } from './api/models';
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

function item(overrides: Partial<TechniqueItem> = {}): TechniqueItem {
  return {
    id: 'i-1',
    zone_id: 'z-mayo',
    zone: 'Mesa de Mayo',
    legend_number: 1,
    source_text: 'Pinzas Kelly',
    components: [{ instrument_id: 'x', suture_id: null, name: 'Pinza Kelly' }],
    cells: [{ row: 2, column: 3 }],
    ...overrides,
  };
}

describe('toTables', () => {
  it('arma una mesa por cada mesa que la versión lleva, con su tamaño', () => {
    expect(toTables([MAYO, RESERVE], [])).toEqual([
      { zoneId: 'z-mayo', name: 'Mesa de Mayo', rows: 7, columns: 5, items: [] },
      { zoneId: 'z-reserva', name: 'Mesa de reserva', rows: 6, columns: 8, items: [] },
    ]);
  });

  it('deja fuera la mesa que la técnica no lleva (used: false)', () => {
    const notUsed: ZoneLayout = { ...RESERVE, used: false, rows: null, columns: null };
    expect(toTables([MAYO, notUsed], []).map((table) => table.zoneId)).toEqual(['z-mayo']);
  });

  it('deja fuera una mesa usada a la que le falta el tamaño, en vez de inventarlo', () => {
    const noSize: ZoneLayout = { ...RESERVE, rows: null };
    expect(toTables([noSize], [])).toEqual([]);
  });

  it('sin mesas no hay nada que dibujar', () => {
    expect(toTables([], [])).toEqual([]);
  });

  it('pone cada objeto en su mesa, con su número y sus celdas', () => {
    const inMayo = item({ id: 'a', legend_number: 4 });
    const inReserve = item({ id: 'b', zone_id: 'z-reserva', legend_number: 2 });
    const [mayo, reserve] = toTables([MAYO, RESERVE], [inMayo, inReserve]);
    expect(mayo.items).toEqual([
      {
        id: 'a',
        legendNumber: 4,
        name: 'Pinza Kelly',
        components: ['Pinza Kelly'],
        cells: [{ row: 2, column: 3 }],
      },
    ]);
    expect(reserve.items.map((it) => it.id)).toEqual(['b']);
  });

  it('un objeto en varias celdas sigue siendo un solo objeto', () => {
    const cells = [
      { row: 4, column: 2 },
      { row: 5, column: 1 },
    ];
    const [mayo] = toTables([MAYO], [item({ cells })]);
    expect(mayo.items).toHaveLength(1);
    expect(mayo.items[0].cells).toEqual(cells);
  });

  it('conserva el objeto sin celda (la fuente no lo ubica) y el que no trae número', () => {
    const unplaced = item({ id: 'u', cells: [] });
    const unnumbered = item({ id: 'n', legend_number: null });
    const [mayo] = toTables([MAYO], [unplaced, unnumbered]);
    expect(mayo.items.map((it) => [it.id, it.legendNumber, it.cells.length])).toEqual([
      ['u', 1, 0],
      ['n', null, 1],
    ]);
  });

  it('el nombre del objeto son sus componentes unidos con «y»', () => {
    const components = [
      { instrument_id: 'a', suture_id: null, name: 'Mango de bisturí N.° 3' },
      { instrument_id: 'b', suture_id: null, name: 'Hoja de bisturí #15' },
    ];
    const [mayo] = toTables([MAYO], [item({ components })]);
    expect(mayo.items[0].name).toBe('Mango de bisturí N.° 3 y Hoja de bisturí #15');
    expect(mayo.items[0].components).toEqual(['Mango de bisturí N.° 3', 'Hoja de bisturí #15']);
  });

  it('sin componentes, el nombre es el texto de la fuente', () => {
    const [mayo] = toTables([MAYO], [item({ components: [], source_text: 'Cocas' })]);
    expect(mayo.items[0].name).toBe('Cocas');
  });

  it('descarta el objeto sin mesa (solo del listado) y el de una mesa que no se dibuja', () => {
    const listOnly = item({ id: 'l', zone_id: null, zone: null, legend_number: null, cells: [] });
    const inUnusedZone = item({ id: 'x', zone_id: 'z-reserva' });
    const notUsed: ZoneLayout = { ...RESERVE, used: false, rows: null, columns: null };
    const [mayo] = toTables([MAYO, notUsed], [listOnly, inUnusedZone]);
    expect(mayo.items).toEqual([]);
  });
});

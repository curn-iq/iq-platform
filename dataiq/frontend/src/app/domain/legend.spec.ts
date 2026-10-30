import type { TableItem } from './table';
import { legendEntries } from './legend';

function item(overrides: Partial<TableItem> = {}): TableItem {
  return {
    id: 'i-1',
    legendNumber: 1,
    name: 'Pinza Kelly',
    components: ['Pinza Kelly'],
    instruments: ['Pinza Kelly'],
    cells: [{ row: 1, column: 1 }],
    ...overrides,
  };
}

describe('legendEntries', () => {
  it('lista los objetos por número, sin importar el orden en que lleguen', () => {
    const entries = legendEntries([
      item({ id: 'b', legendNumber: 10 }),
      item({ id: 'a', legendNumber: 2 }),
      item({ id: 'c', legendNumber: 1 }),
    ]);
    expect(entries.map((entry) => entry.number)).toEqual([1, 2, 10]);
  });

  it('un objeto con celdas está en la mesa: se puede señalar', () => {
    expect(legendEntries([item({ name: 'Pinza de Allis' })])).toEqual([
      { id: 'i-1', number: 1, name: 'Pinza de Allis', kind: 'placed' },
    ]);
  });

  it('un objeto con nombre pero sin celdas se sabe qué es, pero no dónde va', () => {
    expect(legendEntries([item({ cells: [], name: 'Pinza Kelly' })])).toEqual([
      { id: 'i-1', number: 1, name: 'Pinza Kelly', kind: 'unplaced' },
    ]);
  });

  it('un número sin celdas y sin componentes es un hueco: no se sabe qué es ni dónde va', () => {
    expect(legendEntries([item({ cells: [], components: [], name: 'Mb 4 h.b 2º' })])).toEqual([
      { id: 'i-1', number: 1, name: null, kind: 'gap' },
    ]);
  });

  it('un objeto sin componentes pero con celdas está en la mesa: no es un hueco', () => {
    const [entry] = legendEntries([item({ components: [], name: 'suturas' })]);
    expect(entry).toMatchObject({ kind: 'placed', name: 'suturas' });
  });

  it('un objeto sin número no tiene fila en la leyenda', () => {
    expect(legendEntries([item({ legendNumber: null })])).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import type { EditorItem, EditorZone } from './editor-content';
import {
  addObjectToZone,
  clampSize,
  clearCell,
  editorTable,
  ensureZone,
  instrumentIdsInZone,
  itemsOfZone,
  markNotCarried,
  mostUsedInZone,
  nextLegendNumber,
  occupantAt,
  placeObject,
  placeText,
  resizeZone,
  tableHint,
  type TableData,
  type ZoneRef,
} from './table-editor';

const MAYO: ZoneRef = { id: 'z-mayo', name: 'Mesa de Mayo' };
const RESERVE: ZoneRef = { id: 'z-reserva', name: 'Mesa de reserva' };

const mayoZone = (over: Partial<EditorZone> = {}): EditorZone => ({
  zone_id: 'z-mayo',
  zone: 'Mesa de Mayo',
  used: true,
  rows: 4,
  columns: 6,
  ...over,
});

const item = (over: Partial<EditorItem> & { name?: string } = {}): EditorItem => {
  const { name = 'Pinza', ...rest } = over;
  return {
    zone_id: 'z-mayo',
    legend_number: 1,
    source_text: name,
    components: [{ instrument_id: `i-${name}`, suture_id: null, name }],
    cells: [],
    ...rest,
  };
};

const data = (items: EditorItem[], zones: EditorZone[] = [mayoZone()]): TableData => ({
  zones,
  items,
});

describe('clampSize', () => {
  it('queda entre 2 y 10', () => {
    expect(clampSize(1)).toBe(2);
    expect(clampSize(5)).toBe(5);
    expect(clampSize(11)).toBe(10);
    expect(clampSize(3.6)).toBe(4);
  });
});

describe('ensureZone', () => {
  it('suma la mesa con 4 filas y 6 columnas si no estaba', () => {
    expect(ensureZone([], MAYO)).toEqual([mayoZone()]);
  });

  it('la que estaba como «no lleva» pasa a llevarse con el tamaño inicial', () => {
    const omitted = mayoZone({ used: false, rows: null, columns: null });
    expect(ensureZone([omitted], MAYO)).toEqual([mayoZone()]);
  });

  it('una que ya se lleva no cambia', () => {
    const custom = mayoZone({ rows: 3, columns: 8 });
    expect(ensureZone([custom], MAYO)).toEqual([custom]);
  });
});

describe('itemsOfZone y nextLegendNumber', () => {
  const items = [
    item({ name: 'C', legend_number: 3 }),
    item({ name: 'R', zone_id: 'z-reserva', legend_number: 7 }),
    item({ name: 'A', legend_number: 1 }),
    item({ name: 'X', legend_number: null }),
  ];

  it('ordena por número y deja al final los que no tienen', () => {
    expect(itemsOfZone(items, 'z-mayo').map(({ item: i }) => i.source_text)).toEqual([
      'A',
      'C',
      'X',
    ]);
    expect(itemsOfZone(items, 'z-mayo').map(({ index }) => index)).toEqual([2, 0, 3]);
  });

  it('el siguiente número es el mayor de la mesa más uno, y cada mesa lleva el suyo', () => {
    expect(nextLegendNumber(items, 'z-mayo')).toBe(4);
    expect(nextLegendNumber(items, 'z-reserva')).toBe(8);
    expect(nextLegendNumber(items, 'z-otra')).toBe(1);
  });
});

describe('instrumentIdsInZone', () => {
  it('junta los instrumentos de los objetos de esa mesa, no los de otra', () => {
    const items = [item({ name: 'A' }), item({ name: 'B', zone_id: 'z-reserva' })];
    expect([...instrumentIdsInZone(items, 'z-mayo')]).toEqual(['i-A']);
  });
});

describe('addObjectToZone', () => {
  const pinza = { id: 'i-Pinza', name: 'Pinza' };

  it('crea la mesa y el objeto, con el siguiente número y sin lugar', () => {
    const result = addObjectToZone(data([], []), MAYO, pinza);
    expect(result.zones).toEqual([mayoZone()]);
    expect(result.items).toEqual([
      {
        zone_id: 'z-mayo',
        legend_number: 1,
        source_text: 'Pinza',
        components: [{ instrument_id: 'i-Pinza', suture_id: null, name: 'Pinza' }],
        cells: [],
      },
    ]);
  });

  it('numera a continuación del mayor de la mesa', () => {
    const result = addObjectToZone(data([item({ name: 'A', legend_number: 4 })]), MAYO, pinza);
    expect(result.items.at(-1)?.legend_number).toBe(5);
  });

  it('no repite un instrumento que ya está en la mesa', () => {
    const before = data([item({ name: 'Pinza' })]);
    expect(addObjectToZone(before, MAYO, pinza)).toBe(before);
  });

  it('pasa a la mesa el objeto suelto de ese instrumento en vez de duplicarlo', () => {
    const loose = item({ name: 'Pinza', zone_id: null, legend_number: null });
    const result = addObjectToZone(data([loose]), MAYO, pinza);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ zone_id: 'z-mayo', legend_number: 1, cells: [] });
  });

  it('no toca un objeto suelto de varios componentes', () => {
    const combined = item({
      name: 'Pinza',
      zone_id: null,
      legend_number: null,
      components: [
        { instrument_id: 'i-Pinza', suture_id: null, name: 'Pinza' },
        { instrument_id: 'i-Tijera', suture_id: null, name: 'Tijera' },
      ],
    });
    const result = addObjectToZone(data([combined]), MAYO, pinza);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toBe(combined);
  });

  it('el instrumento puede estar en las dos mesas', () => {
    const before = data([item({ name: 'Pinza' })]);
    const result = addObjectToZone(before, RESERVE, pinza);
    expect(result.items).toHaveLength(2);
    expect(result.zones.map((zone) => zone.zone_id)).toEqual(['z-mayo', 'z-reserva']);
  });
});

describe('placeObject', () => {
  it('pone el objeto en una celda libre', () => {
    const result = placeObject(data([item()]), 'z-mayo', 0, 2, 3);
    expect(result.items[0].cells).toEqual([{ row: 2, column: 3 }]);
  });

  it('mover a la celda de otro los intercambia', () => {
    const before = data([
      item({ name: 'A', cells: [{ row: 1, column: 1 }] }),
      item({ name: 'B', cells: [{ row: 2, column: 2 }] }),
    ]);
    const result = placeObject(before, 'z-mayo', 0, 2, 2);
    expect(result.items[0].cells).toEqual([{ row: 2, column: 2 }]);
    expect(result.items[1].cells).toEqual([{ row: 1, column: 1 }]);
  });

  it('un objeto sin lugar que cae en una celda ocupada deja al que estaba sin ubicar', () => {
    const before = data([item({ name: 'A' }), item({ name: 'B', cells: [{ row: 1, column: 1 }] })]);
    const result = placeObject(before, 'z-mayo', 0, 1, 1);
    expect(result.items[0].cells).toEqual([{ row: 1, column: 1 }]);
    expect(result.items[1].cells).toEqual([]);
  });

  it('una celda fuera de la mesa, o un objeto de otra mesa, no cambian nada', () => {
    const before = data([item(), item({ name: 'R', zone_id: 'z-reserva' })]);
    expect(placeObject(before, 'z-mayo', 0, 5, 1)).toBe(before);
    expect(placeObject(before, 'z-mayo', 0, 1, 7)).toBe(before);
    expect(placeObject(before, 'z-mayo', 0, 0, 1)).toBe(before);
    expect(placeObject(before, 'z-mayo', 1, 1, 1)).toBe(before);
    expect(placeObject(before, 'z-mayo', 9, 1, 1)).toBe(before);
  });

  it('soltar en su propia celda no cambia nada', () => {
    const before = data([item({ cells: [{ row: 1, column: 1 }] })]);
    expect(placeObject(before, 'z-mayo', 0, 1, 1)).toBe(before);
  });

  it('una mesa que no se lleva no recibe objetos', () => {
    const before = data([item()], [mayoZone({ used: false, rows: null, columns: null })]);
    expect(placeObject(before, 'z-mayo', 0, 1, 1)).toBe(before);
  });

  describe('objeto de varias celdas', () => {
    const wide = item({
      name: 'Campo',
      cells: [
        { row: 1, column: 2 },
        { row: 1, column: 3 },
      ],
    });

    it('se traslada entero con su primera celda en la elegida', () => {
      const result = placeObject(data([wide]), 'z-mayo', 0, 3, 1);
      expect(result.items[0].cells).toEqual([
        { row: 3, column: 1 },
        { row: 3, column: 2 },
      ]);
    });

    it('arrastrado por otra de sus celdas, esa es la que cae en la elegida', () => {
      // Agarrado por (1,3) y soltado en (2,3): baja una fila, sin correrse de columna
      const result = placeObject(data([wide]), 'z-mayo', 0, 2, 3, { row: 1, column: 3 });
      expect(result.items[0].cells).toEqual([
        { row: 2, column: 2 },
        { row: 2, column: 3 },
      ]);
    });

    it('una celda agarrada que no es suya cuenta como su primera celda', () => {
      const result = placeObject(data([wide]), 'z-mayo', 0, 3, 1, { row: 4, column: 4 });
      expect(result.items[0].cells).toEqual([
        { row: 3, column: 1 },
        { row: 3, column: 2 },
      ]);
    });

    it('no se mueve si no cabe', () => {
      const before = data([wide]);
      expect(placeObject(before, 'z-mayo', 0, 1, 6)).toBe(before);
    });

    it('no se mueve si pisa a otro', () => {
      const before = data([wide, item({ name: 'B', cells: [{ row: 3, column: 2 }] })]);
      expect(placeObject(before, 'z-mayo', 0, 3, 1)).toBe(before);
    });

    it('puede pisar sus propias celdas al correrse una', () => {
      const result = placeObject(data([wide]), 'z-mayo', 0, 1, 3);
      expect(result.items[0].cells).toEqual([
        { row: 1, column: 3 },
        { row: 1, column: 4 },
      ]);
    });

    it('un objeto de una celda no se intercambia con uno de varias', () => {
      const before = data([item({ name: 'A', cells: [{ row: 3, column: 1 }] }), wide]);
      expect(placeObject(before, 'z-mayo', 0, 1, 2)).toBe(before);
    });
  });
});

describe('occupantAt y clearCell', () => {
  const items = [item({ name: 'A', cells: [{ row: 1, column: 1 }] }), item({ name: 'B' })];

  it('dice qué objeto ocupa la celda, o -1', () => {
    expect(occupantAt(items, 'z-mayo', 1, 1)).toBe(0);
    expect(occupantAt(items, 'z-mayo', 2, 2)).toBe(-1);
    expect(occupantAt(items, 'z-reserva', 1, 1)).toBe(-1);
  });

  it('vaciar la celda deja al objeto sin ubicar, en la mesa', () => {
    const result = clearCell(data(items), 'z-mayo', 1, 1);
    expect(result.items[0]).toMatchObject({ zone_id: 'z-mayo', legend_number: 1, cells: [] });
  });

  it('vaciar una celda vacía no cambia nada', () => {
    const before = data(items);
    expect(clearCell(before, 'z-mayo', 3, 3)).toBe(before);
  });

  it('vaciar una celda de un objeto de varias lo deja sin ubicar entero', () => {
    const wide = item({
      cells: [
        { row: 1, column: 1 },
        { row: 1, column: 2 },
      ],
    });
    expect(clearCell(data([wide]), 'z-mayo', 1, 2).items[0].cells).toEqual([]);
  });
});

describe('resizeZone', () => {
  it('cambia el tamaño y respeta los límites', () => {
    const result = resizeZone(data([]), MAYO, 1, 12);
    expect(result.zones[0]).toMatchObject({ rows: 2, columns: 10 });
  });

  it('crea la mesa si no estaba', () => {
    expect(resizeZone(data([], []), MAYO, 3, 5).zones).toEqual([mayoZone({ rows: 3, columns: 5 })]);
  });

  it('los objetos con una celda que queda fuera vuelven a sin ubicar; los demás no', () => {
    const before = data([
      item({ name: 'A', cells: [{ row: 4, column: 1 }] }),
      item({ name: 'B', cells: [{ row: 1, column: 1 }] }),
      item({
        name: 'C',
        cells: [
          { row: 2, column: 5 },
          { row: 2, column: 6 },
        ],
      }),
    ]);
    const result = resizeZone(before, MAYO, 3, 5);
    expect(result.items[0].cells).toEqual([]);
    expect(result.items[1]).toBe(before.items[1]);
    expect(result.items[2].cells).toEqual([]);
  });

  it('no toca los objetos de la otra mesa', () => {
    const other = item({ name: 'R', zone_id: 'z-reserva', cells: [{ row: 4, column: 6 }] });
    const result = resizeZone(data([other]), MAYO, 2, 2);
    expect(result.items[0]).toBe(other);
  });
});

describe('markNotCarried', () => {
  it('deja la mesa en used:false y sin tamaño', () => {
    const result = markNotCarried(data([]), MAYO);
    expect(result.zones).toEqual([mayoZone({ used: false, rows: null, columns: null })]);
  });

  it('crea la mesa como «no lleva» si no estaba', () => {
    const result = markNotCarried(data([], []), RESERVE);
    expect(result.zones).toEqual([
      { zone_id: 'z-reserva', zone: 'Mesa de reserva', used: false, rows: null, columns: null },
    ]);
  });

  it('los objetos de la mesa quedan sin mesa, sin número y sin lugar, y los demás no cambian', () => {
    const inMayo = item({ name: 'A', cells: [{ row: 1, column: 1 }] });
    const inReserve = item({ name: 'R', zone_id: 'z-reserva', cells: [{ row: 1, column: 1 }] });
    const result = markNotCarried(data([inMayo, inReserve]), MAYO);
    expect(result.items[0]).toMatchObject({ zone_id: null, legend_number: null, cells: [] });
    expect(result.items[0].components).toEqual(inMayo.components);
    expect(result.items[1]).toBe(inReserve);
  });
});

describe('editorTable', () => {
  it('arma la mesa del diagrama con sus objetos en orden de número', () => {
    const table = editorTable(mayoZone({ rows: 3, columns: 5 }), [
      item({ name: 'B', legend_number: 2, cells: [{ row: 1, column: 1 }] }),
      item({ name: 'A', legend_number: 1 }),
      item({ name: 'R', zone_id: 'z-reserva' }),
    ]);
    expect(table).toMatchObject({ zoneId: 'z-mayo', name: 'Mesa de Mayo', rows: 3, columns: 5 });
    expect(table.items.map((i) => i.name)).toEqual(['A', 'B']);
    expect(table.items[1]).toMatchObject({
      id: '0',
      legendNumber: 2,
      components: ['B'],
      instruments: ['B'],
      cells: [{ row: 1, column: 1 }],
    });
  });

  it('una sutura no cuenta como instrumento', () => {
    const table = editorTable(mayoZone(), [
      item({
        components: [
          { instrument_id: 'i-Porta', suture_id: null, name: 'Porta' },
          { instrument_id: null, suture_id: 's-1', name: 'Seda' },
        ],
      }),
    ]);
    expect(table.items[0].instruments).toEqual(['Porta']);
    expect(table.items[0].components).toEqual(['Porta', 'Seda']);
  });
});

describe('tableHint y placeText', () => {
  it('la ayuda dice lo que falta', () => {
    expect(tableHint([])).toBe('Agregar el primer objeto.');
    expect(tableHint([item()])).toBe('Falta ubicar 1 objeto.');
    expect(tableHint([item(), item()])).toBe('Faltan por ubicar 2 objetos.');
    expect(tableHint([item({ cells: [{ row: 1, column: 1 }] })])).toBe('Todo está en su lugar.');
  });

  it('el lugar es la primera celda en orden de lectura', () => {
    expect(placeText({ cells: [] })).toBe('Sin ubicar');
    expect(
      placeText({
        cells: [
          { row: 2, column: 1 },
          { row: 1, column: 4 },
        ],
      }),
    ).toBe('Fila 1 · Columna 4');
  });
});

describe('mostUsedInZone', () => {
  const instruments = ['a', 'b', 'c', 'd'].map((id) => ({
    id,
    name: id.toUpperCase(),
    category: 'x',
    aliases: [],
  }));
  const technique = (...ids: string[]) => ({
    items: ids.map((id) => ({
      zone: 'Mesa de reserva',
      components: [{ instrument_id: id }],
    })),
  });

  it('ordena por cuántas técnicas lo usan y desempata por nombre', () => {
    const result = mostUsedInZone(
      [technique('b', 'a'), technique('b'), technique('c', 'a'), technique('b')],
      'Mesa de reserva',
      instruments,
      10,
    );
    expect(result.map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('cuenta una vez por técnica y solo la mesa pedida', () => {
    const repeated = { items: [...technique('a').items, ...technique('a').items] };
    const elsewhere = { items: [{ zone: 'Mesa de Mayo', components: [{ instrument_id: 'd' }] }] };
    const result = mostUsedInZone([repeated, elsewhere], 'Mesa de reserva', instruments, 10);
    expect(result.map((i) => i.id)).toEqual(['a']);
  });

  it('respeta el límite', () => {
    const result = mostUsedInZone([technique('a', 'b', 'c')], 'Mesa de reserva', instruments, 2);
    expect(result).toHaveLength(2);
  });
});

import type { EditorContent, EditorItem, EditorZone } from './editor-content';
import { clinicalDiff, instrumentalDiff, reviewDiff, sectionNotes, zoneDiff } from './version-diff';

const MAYO: EditorZone = {
  zone_id: 'z-mayo',
  zone: 'Mesa de Mayo',
  used: true,
  rows: 4,
  columns: 6,
};
const RESERVE: EditorZone = {
  zone_id: 'z-reserva',
  zone: 'Mesa de reserva',
  used: true,
  rows: 3,
  columns: 5,
};

function content(overrides: Partial<EditorContent> = {}): EditorContent {
  return {
    cups_code: null,
    anesthesia: null,
    patient_position: null,
    drapes: null,
    description: null,
    indications: null,
    complications: null,
    surgical_technique: null,
    source: null,
    zones: [MAYO, RESERVE],
    items: [],
    sutures: [],
    equipment: [],
    devices: [],
    ...overrides,
  };
}

function item(
  zone: EditorZone | null,
  number: number | null,
  name: string,
  cells: [number, number][] = [],
  extra: string[] = [],
): EditorItem {
  return {
    zone_id: zone?.zone_id ?? null,
    legend_number: number,
    source_text: name,
    components: [name, ...extra].map((n) => ({
      instrument_id: `i-${n}`,
      suture_id: null,
      name: n,
    })),
    cells: cells.map(([row, column]) => ({ row, column })),
  };
}

const row = (rows: ReturnType<typeof clinicalDiff>, label: string) =>
  rows.find((r) => r.label === label)!;

describe('clinicalDiff', () => {
  it('trae todos los campos en el orden del editor', () => {
    expect(clinicalDiff(content(), content()).map((r) => r.label)).toEqual([
      'Para qué sirve',
      'Indicaciones',
      'Complicaciones',
      'Técnica quirúrgica',
      'Código CUPS',
      'Anestesia',
      'Ropa',
      'Posición del paciente',
      'Fuente',
      'Suturas',
      'Equipos biomédicos',
      'Equipo médico-quirúrgico',
    ]);
  });

  it('un campo que no cambió no es un cambio', () => {
    const same = content({ anesthesia: 'General' });

    expect(row(clinicalDiff(same, same), 'Anestesia').change).toBeNull();
  });

  it('de vacío a texto es «agregado»; de texto a vacío, «quitado»; de un texto a otro, «modificado»', () => {
    const rows = clinicalDiff(
      content({ description: null, indications: 'Bocio.', anesthesia: 'General' }),
      content({ description: 'Extirpar la tiroides.', indications: null, anesthesia: 'Regional' }),
    );

    expect(row(rows, 'Para qué sirve')).toMatchObject({
      published: '',
      proposed: 'Extirpar la tiroides.',
      change: 'added',
    });
    expect(row(rows, 'Indicaciones').change).toBe('removed');
    expect(row(rows, 'Anestesia').change).toBe('modified');
  });

  it('un texto en blanco cuenta como vacío', () => {
    const rows = clinicalDiff(content({ drapes: '   ' }), content({ drapes: null }));

    expect(row(rows, 'Ropa').change).toBeNull();
  });

  it('los espacios de los bordes no son un cambio', () => {
    const rows = clinicalDiff(content({ drapes: 'Campos' }), content({ drapes: '  Campos ' }));

    expect(row(rows, 'Ropa').change).toBeNull();
  });

  it('los equipos se comparan sin distinguir orden, tildes ni mayúsculas', () => {
    const rows = clinicalDiff(
      content({ equipment: ['Electrobisturí', 'Aspirador'] }),
      content({ equipment: ['aspirador', 'electrobisturi'] }),
    );

    expect(row(rows, 'Equipos biomédicos').change).toBeNull();
    expect(row(rows, 'Equipos biomédicos').proposed).toBe('aspirador, electrobisturi');
  });

  it('agregar un equipo es un cambio', () => {
    const rows = clinicalDiff(
      content({ devices: ['Torre'] }),
      content({ devices: ['Torre', 'Lámpara'] }),
    );

    expect(row(rows, 'Equipo médico-quirúrgico').change).toBe('modified');
  });

  it('las suturas van una por línea, con su plano, y las filas sin sutura no cuentan', () => {
    const rows = clinicalDiff(
      content(),
      content({
        sutures: [
          { plane: 'Piel', name: 'Seda', gauge: '2/0', needle_type: 'cortante' },
          { plane: 'Fascia', name: 'Vicryl', gauge: '', needle_type: '' },
          { plane: 'Músculo', name: '  ', gauge: '', needle_type: '' },
        ],
      }),
    );

    expect(row(rows, 'Suturas').proposed).toBe('Piel · Seda 2/0, cortante\nFascia · Vicryl');
    expect(row(rows, 'Suturas').change).toBe('added');
  });

  it('cambiar el plano de una sutura es un cambio', () => {
    const before = { plane: 'Piel', name: 'Seda', gauge: '2/0', needle_type: '' };
    const rows = clinicalDiff(
      content({ sutures: [before] }),
      content({ sutures: [{ ...before, plane: 'Fascia' }] }),
    );

    expect(row(rows, 'Suturas').change).toBe('modified');
  });

  it('sin versión publicada nada es un cambio, y lo publicado está vacío', () => {
    const rows = clinicalDiff(null, content({ description: 'Texto.' }));

    expect(rows.every((r) => r.change === null)).toBe(true);
    expect(row(rows, 'Para qué sirve')).toMatchObject({ published: '', proposed: 'Texto.' });
  });
});

describe('instrumentalDiff', () => {
  it('lista los objetos de la propuesta, también los que no tienen lugar en la mesa', () => {
    const same = content({
      items: [item(MAYO, 1, 'Pinza Kelly', [[1, 1]]), item(null, null, 'Gasa')],
    });

    const diff = instrumentalDiff(same, same);

    expect(diff.objects).toEqual(['Pinza Kelly', 'Gasa']);
    expect(diff.changes).toEqual([]);
  });

  it('dice qué objetos se agregaron y cuáles se quitaron, los quitados primero', () => {
    const diff = instrumentalDiff(
      content({ items: [item(MAYO, 1, 'Bisturí'), item(MAYO, 2, 'Pinza Kelly')] }),
      content({ items: [item(MAYO, 1, 'Bisturí'), item(MAYO, 3, 'Tijera Mayo')] }),
    );

    expect(diff.changes).toEqual([
      { kind: 'removed', name: 'Pinza Kelly' },
      { kind: 'added', name: 'Tijera Mayo' },
    ]);
  });

  it('mover un objeto no cambia el instrumental', () => {
    const diff = instrumentalDiff(
      content({ items: [item(MAYO, 1, 'Bisturí', [[1, 1]])] }),
      content({ items: [item(MAYO, 1, 'Bisturí', [[2, 2]])] }),
    );

    expect(diff.changes).toEqual([]);
  });

  it('un objeto repetido que se quita una vez cuenta una vez', () => {
    const diff = instrumentalDiff(
      content({ items: [item(MAYO, 1, 'Compresa'), item(RESERVE, 1, 'Compresa')] }),
      content({ items: [item(MAYO, 1, 'Compresa')] }),
    );

    expect(diff.changes).toEqual([{ kind: 'removed', name: 'Compresa' }]);
  });

  it('sin versión publicada no hay cambios', () => {
    expect(instrumentalDiff(null, content({ items: [item(MAYO, 1, 'Bisturí')] })).changes).toEqual(
      [],
    );
  });
});

describe('zoneDiff', () => {
  const published = content({
    items: [
      item(MAYO, 4, 'Pinza Kelly', [[1, 1]]),
      item(MAYO, 6, 'Separador de Senn Miller', [[4, 4]]),
    ],
  });

  it('una pieza movida dice de dónde a dónde', () => {
    const proposed = content({
      items: [
        item(MAYO, 4, 'Pinza Kelly', [[1, 1]]),
        item(MAYO, 6, 'Separador de Senn Miller', [[4, 3]]),
      ],
    });

    const diff = zoneDiff(published, proposed, 'Mesa de Mayo');

    expect(diff.changes).toEqual([
      {
        key: 'moved-6',
        kind: 'moved',
        number: 6,
        name: 'Separador de Senn Miller',
        detail: 'Fila 4 · Columna 4 → Fila 4 · Columna 3',
        fromCells: [{ row: 4, column: 4 }],
        toCells: [{ row: 4, column: 3 }],
      },
    ]);
  });

  it('sin cambios no hay nada que contar', () => {
    expect(zoneDiff(published, published, 'Mesa de Mayo').changes).toEqual([]);
  });

  it('un objeto agregado dice dónde, o que está sin ubicar', () => {
    const proposed = content({
      items: [...published.items, item(MAYO, 7, 'Tijera Mayo', [[2, 3]]), item(MAYO, 8, 'Gasa')],
    });

    const details = zoneDiff(published, proposed, 'Mesa de Mayo').changes.map((c) => [
      c.kind,
      c.number,
      c.detail,
    ]);

    expect(details).toEqual([
      ['added', 7, 'Agregado en Fila 2 · Columna 3'],
      ['added', 8, 'Agregado sin ubicar'],
    ]);
  });

  it('un objeto quitado dice de dónde', () => {
    const proposed = content({ items: [published.items[0]] });

    const [change] = zoneDiff(published, proposed, 'Mesa de Mayo').changes;

    expect(change).toMatchObject({
      kind: 'removed',
      number: 6,
      detail: 'Quitado de Fila 4 · Columna 4',
      fromCells: [{ row: 4, column: 4 }],
      toCells: [],
    });
  });

  it('un objeto con otros componentes en el mismo lugar está modificado', () => {
    const proposed = content({
      items: [
        published.items[0],
        item(MAYO, 6, 'Separador de Senn Miller', [[4, 4]], ['Compresa']),
      ],
    });

    const [change] = zoneDiff(published, proposed, 'Mesa de Mayo').changes;

    expect(change).toMatchObject({ kind: 'modified', number: 6, detail: 'Modificado' });
  });

  it('modificado y movido dice las dos cosas', () => {
    const proposed = content({
      items: [
        published.items[0],
        item(MAYO, 6, 'Separador de Senn Miller', [[4, 3]], ['Compresa']),
      ],
    });

    const [change] = zoneDiff(published, proposed, 'Mesa de Mayo').changes;

    expect(change.detail).toBe('Modificado · Fila 4 · Columna 4 → Fila 4 · Columna 3');
  });

  it('un objeto de varias celdas cuenta las celdas para distinguir su traslado', () => {
    const before = content({
      items: [
        item(MAYO, 1, 'Campo', [
          [1, 1],
          [1, 2],
        ]),
      ],
    });
    const after = content({
      items: [
        item(MAYO, 1, 'Campo', [
          [1, 1],
          [2, 1],
        ]),
      ],
    });

    const [change] = zoneDiff(before, after, 'Mesa de Mayo').changes;

    expect(change.detail).toBe('Fila 1 · Columna 1 (2 celdas) → Fila 1 · Columna 1 (2 celdas)');
    expect(change.kind).toBe('moved');
  });

  it('dos objetos sin número con el mismo nombre que se quitan tienen claves distintas', () => {
    const before = content({
      items: [item(MAYO, null, 'Gasa', [[1, 1]]), item(MAYO, null, 'Gasa', [[1, 2]])],
    });
    const after = content({ items: [] });

    const keys = zoneDiff(before, after, 'Mesa de Mayo').changes.map((change) => change.key);

    expect(keys).toEqual(['removed-Gasa', 'removed-Gasa-2']);
  });

  it('un objeto sin número se empareja por su nombre', () => {
    const before = content({ items: [item(MAYO, null, 'Gasa', [[1, 1]])] });
    const after = content({ items: [item(MAYO, null, 'gasa', [[2, 2]])] });

    expect(zoneDiff(before, after, 'Mesa de Mayo').changes.map((c) => c.kind)).toEqual(['moved']);
  });

  it('cada mesa tiene su numeración: el 1 de la reserva no es el 1 de Mayo', () => {
    const before = content({ items: [item(MAYO, 1, 'Bisturí'), item(RESERVE, 1, 'Compresa')] });
    const after = content({ items: [item(MAYO, 1, 'Bisturí'), item(RESERVE, 1, 'Gasa')] });

    expect(zoneDiff(before, after, 'Mesa de Mayo').changes).toEqual([]);
    expect(zoneDiff(before, after, 'Mesa de reserva').changes.map((c) => c.kind)).toEqual([
      'modified',
    ]);
  });

  it('los cambios van por número', () => {
    const before = content({ items: [item(MAYO, 3, 'A', [[1, 1]]), item(MAYO, 1, 'B', [[1, 2]])] });
    const after = content({ items: [item(MAYO, 3, 'A', [[2, 1]]), item(MAYO, 1, 'B', [[2, 2]])] });

    expect(zoneDiff(before, after, 'Mesa de Mayo').changes.map((c) => c.number)).toEqual([1, 3]);
  });

  describe('el tamaño y si la mesa se lleva', () => {
    const resized = content({
      zones: [{ ...MAYO, columns: 7 }, RESERVE],
      items: published.items,
    });

    it('un tamaño distinto es un cambio de la mesa, sin objeto ni número', () => {
      const [change, ...rest] = zoneDiff(published, resized, 'Mesa de Mayo').changes;

      expect(change).toMatchObject({
        kind: 'resized',
        number: null,
        name: '',
        detail: 'La mesa pasa de 4 × 6 a 4 × 7',
      });
      expect(rest).toEqual([]);
    });

    it('con otro tamaño también se comparan los objetos', () => {
      const proposed = content({
        zones: [{ ...MAYO, columns: 7 }, RESERVE],
        items: [published.items[0], item(MAYO, 6, 'Separador de Senn Miller', [[4, 5]])],
      });

      expect(zoneDiff(published, proposed, 'Mesa de Mayo').changes.map((c) => c.kind)).toEqual([
        'resized',
        'moved',
      ]);
    });

    it('dejar de llevar la mesa es un cambio, y no se listan sus objetos uno por uno', () => {
      const proposed = content({
        zones: [{ ...MAYO, used: false, rows: null, columns: null }, RESERVE],
        items: published.items.map((i) => ({
          ...i,
          zone_id: null,
          legend_number: null,
          cells: [],
        })),
      });

      const diff = zoneDiff(published, proposed, 'Mesa de Mayo');

      expect(diff.changes.map((c) => c.detail)).toEqual(['La mesa pasa de 4 × 6 a no llevarse']);
      expect(diff.proposed.state).toBe('not_carried');
    });

    it('armar una mesa de la que la versión no decía nada también se dice', () => {
      const before = content({ zones: [RESERVE] });

      const diff = zoneDiff(before, content({ zones: [MAYO, RESERVE] }), 'Mesa de Mayo');

      expect(diff.published?.state).toBe('none');
      expect(diff.changes.map((c) => c.detail)).toEqual(['La mesa pasa de sin arreglo a 4 × 6']);
    });

    it('una mesa usada sin tamaño es «sin arreglo», como el detalle de la técnica', () => {
      const noSize = content({ zones: [{ ...MAYO, rows: null, columns: null }, RESERVE] });

      expect(zoneDiff(noSize, noSize, 'Mesa de Mayo').proposed.state).toBe('none');
    });
  });

  it('el diagrama de cada lado es el de la versión, con su tamaño y sus objetos', () => {
    const diff = zoneDiff(published, published, 'Mesa de Mayo');

    expect(diff.published?.state).toBe('carried');
    expect(diff.published?.table).toMatchObject({ rows: 4, columns: 6 });
    expect(diff.proposed.table?.items.map((i) => i.legendNumber)).toEqual([4, 6]);
    expect(diff.proposed.objects).toBe(2);
  });

  it('sin versión publicada solo está la propuesta y no hay cambios', () => {
    const diff = zoneDiff(null, published, 'Mesa de Mayo');

    expect(diff.published).toBeNull();
    expect(diff.changes).toEqual([]);
    expect(diff.proposed.state).toBe('carried');
  });
});

describe('sectionNotes', () => {
  it('cuenta los cambios de cada sección', () => {
    const before = content({
      anesthesia: 'General',
      items: [item(MAYO, 1, 'A', [[1, 1]]), item(MAYO, 2, 'B', [[1, 2]])],
    });
    const after = content({
      anesthesia: 'Regional',
      description: 'Nuevo.',
      items: [item(MAYO, 1, 'A', [[2, 1]]), item(MAYO, 2, 'B', [[1, 2]]), item(null, null, 'C')],
    });

    const notes = sectionNotes(reviewDiff(before, after));

    expect(notes.clinical).toEqual({ label: '2 cambios', highlight: true, changes: 2 });
    expect(notes.instrumental).toEqual({ label: '1 cambio', highlight: true, changes: 1 });
    expect(notes.mayo).toEqual({ label: '1 cambio', highlight: true, changes: 1 });
    expect(notes.reserve).toEqual({ label: 'sin cambios', highlight: false, changes: 0 });
  });

  it('en una técnica nueva dice cuánto hay, no cuánto cambió', () => {
    const proposed = content({
      description: 'Texto.',
      anesthesia: 'General',
      items: [item(MAYO, 1, 'A', [[1, 1]])],
    });

    const notes = sectionNotes(reviewDiff(null, proposed));

    expect(notes.clinical).toEqual({ label: '2 campos', highlight: false, changes: 0 });
    expect(notes.instrumental.label).toBe('1 objeto');
    expect(notes.mayo.label).toBe('1 objeto');
    expect(notes.reserve.label).toBe('sin objetos');
    expect(reviewDiff(null, proposed).isNew).toBe(true);
  });

  it('una técnica nueva vacía dice «sin campos»', () => {
    expect(sectionNotes(reviewDiff(null, content())).clinical.label).toBe('sin campos');
  });
});

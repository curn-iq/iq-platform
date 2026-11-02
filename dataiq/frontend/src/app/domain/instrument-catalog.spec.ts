import {
  canSave,
  draftOf,
  firstInstrumentId,
  impactText,
  indexGroups,
  missingSource,
  ownerOf,
  placementIndex,
  placementsBySpecialty,
  savedNotice,
  sortedCategoryNames,
  techniqueCount,
  techniqueNames,
  toCreate,
  toUpdate,
  usageSummary,
  type CatalogCategory,
  type CatalogEntry,
  type EntryDraft,
  type TechniqueUse,
} from './instrument-catalog';
import type { Table, TableItem } from './table';

const CATEGORIES: CatalogCategory[] = [
  { id: 'c-pinza', name: 'Pinza' },
  { id: 'c-tijera', name: 'Tijera' },
  { id: 'c-sin', name: 'Sin clasificar' },
];

function entry(overrides: Partial<CatalogEntry> & Pick<CatalogEntry, 'id' | 'name'>): CatalogEntry {
  return {
    category: 'Pinza',
    description: null,
    description_source: null,
    aliases: [],
    ...overrides,
  };
}

const KELLY = entry({ id: 'i-kelly', name: 'Pinza Kelly', aliases: ['Pinza hemostática Kelly'] });
const ALLIS = entry({ id: 'i-allis', name: 'Pinza de Allis' });
const MAYO = entry({
  id: 'i-mayo',
  name: 'Tijera de Mayo',
  category: 'Tijera',
  aliases: ['Tijeras Mayo'],
});
const GAUZE = entry({ id: 'i-gasa', name: 'Gasa', category: 'Sin clasificar' });
const ALL = [KELLY, ALLIS, MAYO, GAUZE];

function tableItem(id: string, number: number | null, cells: [number, number][]): TableItem {
  return {
    id,
    legendNumber: number,
    name: id,
    components: [],
    instruments: [],
    cells: cells.map(([row, column]) => ({ row, column })),
  };
}

function table(name: string, items: TableItem[]): Table {
  return { zoneId: `z-${name}`, name, rows: 4, columns: 6, items };
}

const TECHNIQUES: TechniqueUse[] = [
  {
    id: 't-tiroides',
    name: 'Tiroidectomía',
    specialty: 'Cirugía general',
    items: [
      { id: 'o-1', components: [{ instrument_id: 'i-kelly' }] },
      { id: 'o-2', components: [{ instrument_id: 'i-kelly' }, { instrument_id: 'i-mayo' }] },
      { id: 'o-3', components: [{ instrument_id: 'i-allis' }] },
    ],
    tables: [
      table('Mesa de Mayo', [
        tableItem('o-1', 4, [[1, 1]]),
        tableItem('o-2', 6, [
          [2, 2],
          [2, 3],
        ]),
      ]),
      table('Mesa de reserva', [tableItem('o-3', 1, [])]),
    ],
  },
  {
    id: 't-cesarea',
    name: 'Cesárea',
    specialty: 'Ginecología',
    items: [{ id: 'p-1', components: [{ instrument_id: 'i-kelly' }, { instrument_id: null }] }],
    tables: [table('Mesa de reserva', [tableItem('p-1', 2, [[1, 1]])])],
  },
];

describe('placementIndex', () => {
  const index = placementIndex(TECHNIQUES);

  it('dice en qué mesas de qué técnicas va cada instrumento, por técnica y por mesa', () => {
    expect(index.get('i-kelly')!.map((p) => `${p.technique} · ${p.table.name}`)).toEqual([
      'Cesárea · Mesa de reserva',
      'Tiroidectomía · Mesa de Mayo',
      'Tiroidectomía · Mesa de Mayo',
    ]);
  });

  it('un objeto de varios componentes cuenta para cada uno de sus instrumentos', () => {
    expect(index.get('i-mayo')!.map((p) => p.item.id)).toEqual(['o-2']);
    expect(index.get('i-kelly')!.map((p) => p.item.id)).toContain('o-2');
  });

  it('un objeto sin celdas no es un «dónde va»', () => {
    expect(index.get('i-allis')).toBeUndefined();
  });

  it('un instrumento que no está en ninguna mesa no tiene entrada', () => {
    expect(index.get('i-gasa')).toBeUndefined();
  });

  it('cada lugar lleva su técnica, su especialidad, su mesa y su objeto', () => {
    const [first] = index.get('i-mayo')!;

    expect(first).toMatchObject({
      techniqueId: 't-tiroides',
      technique: 'Tiroidectomía',
      specialty: 'Cirugía general',
    });
    expect(first.table.name).toBe('Mesa de Mayo');
    expect(first.item.legendNumber).toBe(6);
  });

  it('las técnicas sin mesas no aportan nada', () => {
    expect(placementIndex([]).size).toBe(0);
  });
});

describe('techniqueCount, techniqueNames y usageSummary', () => {
  const kelly = placementIndex(TECHNIQUES).get('i-kelly')!;

  it('cuenta las técnicas distintas, no las mesas', () => {
    expect(techniqueCount(kelly)).toBe(2);
  });

  it('nombra las técnicas sin repetir, en orden alfabético', () => {
    expect(techniqueNames(kelly)).toEqual(['Cesárea', 'Tiroidectomía']);
  });

  it('dice cuántas técnicas y cuántas mesas', () => {
    expect(usageSummary(kelly)).toBe('En 2 técnicas · 3 mesas');
  });

  it('usa el singular', () => {
    expect(usageSummary(placementIndex(TECHNIQUES).get('i-mayo')!)).toBe('En 1 técnica · 1 mesa');
  });

  it('sin mesas lo dice', () => {
    expect(usageSummary([])).toBe('Todavía no está en ninguna mesa');
  });
});

describe('placementsBySpecialty', () => {
  const kelly = placementIndex(TECHNIQUES).get('i-kelly')!;

  it('agrupa por especialidad en el orden que se da', () => {
    const groups = placementsBySpecialty(kelly, ['Ginecología', 'Cirugía general', 'Urología']);

    expect(groups.map((g) => [g.specialty, g.placements.length])).toEqual([
      ['Ginecología', 1],
      ['Cirugía general', 2],
    ]);
  });

  it('una especialidad que no está en la lista va al final', () => {
    const groups = placementsBySpecialty(kelly, ['Cirugía general']);

    expect(groups.map((g) => g.specialty)).toEqual(['Cirugía general', 'Ginecología']);
  });
});

describe('impactText y savedNotice', () => {
  it('nombra las técnicas publicadas en que se verá el cambio', () => {
    expect(impactText(['Cesárea', 'Tiroidectomía'], false)).toBe(
      'Este cambio se verá en 2 técnicas publicadas: Cesárea, Tiroidectomía.',
    );
    expect(impactText(['Cesárea'], false)).toBe(
      'Este cambio se verá en 1 técnica publicada: Cesárea.',
    );
  });

  it('un instrumento que no está en ninguna técnica lo dice', () => {
    expect(impactText([], false)).toBe('Todavía no está en ninguna técnica publicada.');
  });

  it('un instrumento nuevo queda en el catálogo', () => {
    expect(impactText([], true)).toBe('Queda en el catálogo para usarlo en las técnicas.');
  });

  it('el aviso al guardar dice dónde se ve el cambio', () => {
    expect(savedNotice(true, 0)).toBe('Instrumento agregado al catálogo.');
    expect(savedNotice(false, 0)).toBe('Cambios guardados.');
    expect(savedNotice(false, 1)).toBe('Cambios guardados · se ven en 1 técnica.');
    expect(savedNotice(false, 3)).toBe('Cambios guardados · se ven en 3 técnicas.');
  });
});

describe('sortedCategoryNames', () => {
  it('va en orden alfabético con «Sin clasificar» al final', () => {
    expect(
      sortedCategoryNames(['Tijera', 'Sin clasificar', 'Pinza', 'Accesorio', 'Pinza']),
    ).toEqual(['Accesorio', 'Pinza', 'Tijera', 'Sin clasificar']);
  });
});

describe('indexGroups', () => {
  const counts = (id: string) => (id === 'i-kelly' ? 2 : 0);

  it('agrupa por categoría, con «Sin clasificar» al final, y ordena por nombre', () => {
    const groups = indexGroups(ALL, counts, '');

    expect(groups.map((g) => [g.category, g.items.map((i) => i.name)])).toEqual([
      ['Pinza', ['Pinza de Allis', 'Pinza Kelly']],
      ['Tijera', ['Tijera de Mayo']],
      ['Sin clasificar', ['Gasa']],
    ]);
  });

  it('cada fila lleva su cifra de técnicas', () => {
    const [pinza] = indexGroups(ALL, counts, '');

    expect(pinza.items.map((i) => [i.name, i.techniques])).toEqual([
      ['Pinza de Allis', 0],
      ['Pinza Kelly', 2],
    ]);
  });

  it('busca por nombre, sin tildes ni mayúsculas, y resalta lo que coincide', () => {
    const groups = indexGroups(ALL, counts, 'ALLIS');

    expect(groups).toHaveLength(1);
    expect(groups[0].items[0].segments).toEqual([
      { text: 'Pinza de ', match: false },
      { text: 'Allis', match: true },
    ]);
    expect(groups[0].items[0].viaAlias).toBeNull();
  });

  it('busca también por alias y dice por cuál coincidió', () => {
    const groups = indexGroups(ALL, counts, 'hemostática');

    expect(groups.map((g) => g.items.map((i) => [i.name, i.viaAlias]))).toEqual([
      [['Pinza Kelly', 'Pinza hemostática Kelly']],
    ]);
  });

  it('si coincide el nombre no dice alias', () => {
    const groups = indexGroups(ALL, counts, 'kelly');

    expect(groups[0].items[0].viaAlias).toBeNull();
  });

  it('las categorías sin resultados no salen, y sin resultados no hay grupos', () => {
    expect(indexGroups(ALL, counts, 'tijera').map((g) => g.category)).toEqual(['Tijera']);
    expect(indexGroups(ALL, counts, 'zzz')).toEqual([]);
  });

  it('una búsqueda en blanco es como no buscar', () => {
    expect(indexGroups(ALL, counts, '   ')).toHaveLength(3);
  });
});

describe('firstInstrumentId', () => {
  it('es el primero del índice', () => {
    expect(firstInstrumentId(indexGroups(ALL, () => 0, ''))).toBe('i-allis');
  });

  it('sin instrumentos no hay ninguno', () => {
    expect(firstInstrumentId([])).toBeUndefined();
  });
});

describe('draftOf', () => {
  it('un instrumento nuevo empieza vacío', () => {
    expect(draftOf(null, CATEGORIES)).toEqual({
      name: '',
      categoryId: '',
      description: '',
      source: '',
      aliases: [],
    });
  });

  it('una entrada existente trae lo suyo, con el id de su categoría', () => {
    const full = entry({
      id: 'i-x',
      name: 'Tijera de Metzenbaum',
      category: 'Tijera',
      description: 'Para disecar.',
      description_source: 'Libro',
      aliases: ['Metzenbaum'],
    });

    expect(draftOf(full, CATEGORIES)).toEqual({
      name: 'Tijera de Metzenbaum',
      categoryId: 'c-tijera',
      description: 'Para disecar.',
      source: 'Libro',
      aliases: ['Metzenbaum'],
    });
  });
});

describe('ownerOf', () => {
  it('encuentra al instrumento que ya tiene ese nombre, sin tildes ni mayúsculas', () => {
    expect(ownerOf(ALL, 'pinza KELLY', null)?.id).toBe('i-kelly');
  });

  it('o ese alias', () => {
    expect(ownerOf(ALL, 'tijeras mayo', null)?.id).toBe('i-mayo');
  });

  it('no cuenta al instrumento que se edita', () => {
    expect(ownerOf(ALL, 'Pinza Kelly', 'i-kelly')).toBeNull();
    expect(ownerOf(ALL, 'Pinza hemostática Kelly', 'i-kelly')).toBeNull();
  });

  it('un texto vacío o que no es de nadie no tiene dueño', () => {
    expect(ownerOf(ALL, '  ', null)).toBeNull();
    expect(ownerOf(ALL, 'Pinza nueva', null)).toBeNull();
  });
});

describe('guardar', () => {
  const draft = (overrides: Partial<EntryDraft> = {}): EntryDraft => ({
    name: 'Pinza nueva',
    categoryId: 'c-pinza',
    description: '',
    source: '',
    aliases: [],
    ...overrides,
  });

  it('falta la fuente cuando hay descripción y no fuente', () => {
    expect(missingSource(draft({ description: 'Algo.' }))).toBe(true);
    expect(missingSource(draft({ description: 'Algo.', source: ' ' }))).toBe(true);
    expect(missingSource(draft({ description: 'Algo.', source: 'Libro' }))).toBe(false);
    expect(missingSource(draft({ source: 'Libro' }))).toBe(false);
  });

  it('se puede guardar con nombre y categoría, sin dueño del nombre y con la fuente al día', () => {
    expect(canSave(draft(), null)).toBe(true);
  });

  it.each([
    ['sin nombre', draft({ name: '  ' }), null],
    ['sin categoría', draft({ categoryId: '' }), null],
    ['con un nombre que es de otro', draft(), KELLY],
    ['con descripción y sin fuente', draft({ description: 'Algo.' }), null],
  ])('no se puede guardar %s', (_name, value, owner) => {
    expect(canSave(value, owner)).toBe(false);
  });

  describe('toCreate', () => {
    it('manda nombre y categoría, recortados', () => {
      expect(toCreate(draft({ name: '  Pinza nueva ' }))).toEqual({
        name: 'Pinza nueva',
        category_id: 'c-pinza',
      });
    });

    it('con descripción manda también su fuente', () => {
      expect(toCreate(draft({ description: ' Algo. ', source: ' Libro ' }))).toEqual({
        name: 'Pinza nueva',
        category_id: 'c-pinza',
        description: 'Algo.',
        description_source: 'Libro',
      });
    });
  });

  describe('toUpdate', () => {
    const original = entry({
      id: 'i-x',
      name: 'Pinza Kelly',
      category: 'Pinza',
      description: 'Una pinza.',
      description_source: 'Libro',
      aliases: ['Kelly', 'Pinza hemostática'],
    });
    const same = () => draftOf(original, CATEGORIES);

    it('sin cambios no manda nada', () => {
      expect(toUpdate(original, same(), CATEGORIES)).toEqual({});
    });

    it('manda solo lo que cambió', () => {
      expect(toUpdate(original, { ...same(), name: 'Pinza Kelly curva' }, CATEGORIES)).toEqual({
        name: 'Pinza Kelly curva',
      });
      expect(toUpdate(original, { ...same(), categoryId: 'c-tijera' }, CATEGORIES)).toEqual({
        category_id: 'c-tijera',
      });
    });

    it('una descripción nueva va con su fuente', () => {
      expect(
        toUpdate(original, { ...same(), description: 'Otra.', source: 'Otro libro' }, CATEGORIES),
      ).toEqual({ description: 'Otra.', description_source: 'Otro libro' });
    });

    it('cambiar solo la fuente manda solo la fuente', () => {
      expect(toUpdate(original, { ...same(), source: 'Otro libro' }, CATEGORIES)).toEqual({
        description_source: 'Otro libro',
      });
    });

    it('vaciar la descripción manda una cadena vacía, sin fuente', () => {
      expect(toUpdate(original, { ...same(), description: '', source: '' }, CATEGORIES)).toEqual({
        description: '',
      });
    });

    it('los alias van completos si cambiaron, porque reemplazan la lista', () => {
      expect(
        toUpdate(
          original,
          { ...same(), aliases: ['Kelly', 'Pinza hemostática', 'Kelly curva'] },
          CATEGORIES,
        ),
      ).toEqual({ aliases: ['Kelly', 'Pinza hemostática', 'Kelly curva'] });
      expect(toUpdate(original, { ...same(), aliases: [] }, CATEGORIES)).toEqual({ aliases: [] });
    });

    it('un cambio de orden de los alias también es un cambio', () => {
      expect(
        toUpdate(original, { ...same(), aliases: ['Pinza hemostática', 'Kelly'] }, CATEGORIES),
      ).toEqual({
        aliases: ['Pinza hemostática', 'Kelly'],
      });
    });

    it('una descripción que se escribe en una entrada que no la tenía va con su fuente', () => {
      const bare = entry({ id: 'i-y', name: 'Gasa', category: 'Sin clasificar' });

      expect(
        toUpdate(
          bare,
          { ...draftOf(bare, CATEGORIES), description: 'Tela.', source: 'Libro' },
          CATEGORIES,
        ),
      ).toEqual({ description: 'Tela.', description_source: 'Libro' });
    });
  });
});

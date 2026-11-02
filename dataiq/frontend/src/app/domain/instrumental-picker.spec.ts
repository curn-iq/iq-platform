import type { EditorItem } from './editor-content';
import {
  addInstrument,
  catalogGroups,
  categoryChips,
  chosenGroups,
  hasOwnItem,
  instrumentIdsIn,
  matchesInstrument,
  newInstrumentItem,
  removeInstrument,
  removeItemAt,
  suggestions,
  UNCLASSIFIED,
  usageDots,
  type CatalogInstrument,
  type CatalogTechnique,
} from './instrumental-picker';

const instrument = (
  id: string,
  name: string,
  category = 'Pinza',
  aliases: string[] = [],
): CatalogInstrument => ({ id, name, category, aliases });

const KELLY = instrument('i-kelly', 'Pinza Kelly');
const MOYNIHAN = instrument('i-moy', 'Pinza de Moynihan', 'Pinza', ['Pinza Moninjan']);
const BISTURI = instrument('i-bis', 'Mango de bisturí N.° 3', 'Bisturí');
const GASA = instrument('i-gasa', 'Gasa', 'Accesorios');
const CATALOG = [KELLY, MOYNIHAN, BISTURI, GASA];
const ORDER = ['Accesorios', 'Bisturí', 'Pinza'];

const item = (...ids: (string | null)[]): EditorItem => ({
  zone_id: null,
  legend_number: null,
  source_text: 'texto',
  components: ids.map((id) => ({
    instrument_id: id,
    suture_id: id ? null : 's-1',
    name: CATALOG.find((instrument) => instrument.id === id)?.name ?? id ?? 'Seda',
  })),
  cells: [],
});

describe('instrumentIdsIn', () => {
  it('junta los instrumentos de todos los componentes, también los de un objeto compuesto', () => {
    expect([...instrumentIdsIn([item('a'), item('b', 'c'), item(null)])].sort()).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('sin objetos, ninguno', () => {
    expect(instrumentIdsIn([]).size).toBe(0);
  });
});

describe('newInstrumentItem y addInstrument', () => {
  it('el objeto nuevo es solo el instrumento, con su nombre como texto, sin mesa ni número ni celdas', () => {
    expect(newInstrumentItem(KELLY)).toEqual({
      zone_id: null,
      legend_number: null,
      source_text: 'Pinza Kelly',
      components: [{ instrument_id: 'i-kelly', suture_id: null, name: 'Pinza Kelly' }],
      cells: [],
    });
  });

  it('agregar suma el objeto al final y no cambia la lista que recibe', () => {
    const items = [item('a')];

    const next = addInstrument(items, KELLY);

    expect(next).toHaveLength(2);
    expect(next[1].components[0].instrument_id).toBe('i-kelly');
    expect(items).toHaveLength(1);
  });

  it('un instrumento que ya está, solo o dentro de un objeto compuesto, no se suma otra vez', () => {
    expect(addInstrument([item('i-kelly')], KELLY)).toHaveLength(1);
    expect(addInstrument([item('x', 'i-kelly')], KELLY)).toHaveLength(1);
  });
});

describe('removeItemAt', () => {
  it('quita el objeto de esa posición, y una posición que no existe deja todo igual', () => {
    const items = [item('a'), item('b'), item('c')];

    expect(removeItemAt(items, 1).map((i) => i.components[0].instrument_id)).toEqual(['a', 'c']);
    expect(removeItemAt(items, 9)).toHaveLength(3);
  });
});

describe('hasOwnItem y removeInstrument', () => {
  const items = [item('a'), item('b', 'a'), item('a'), item('c')];

  it('hay objeto propio si algún objeto es solo ese instrumento', () => {
    expect(hasOwnItem(items, 'a')).toBe(true);
    expect(hasOwnItem(items, 'c')).toBe(true);
  });

  it('un instrumento que solo está dentro de un objeto compuesto no tiene objeto propio', () => {
    expect(hasOwnItem([item('b', 'a')], 'a')).toBe(false);
    expect(hasOwnItem(items, 'zzz')).toBe(false);
  });

  it('quitar saca todos los objetos que son solo ese instrumento y deja los compuestos', () => {
    const next = removeInstrument(items, 'a');

    expect(next.map((i) => i.components.map((c) => c.instrument_id))).toEqual([['b', 'a'], ['c']]);
  });
});

describe('chosenGroups', () => {
  it('agrupa por la categoría del primer instrumento, en el orden de la API, con la posición de cada objeto', () => {
    const items = [item('i-kelly'), item('i-bis'), item('i-moy')];

    const groups = chosenGroups(items, CATALOG, ORDER);

    expect(groups.map((g) => [g.category, g.items.map((i) => [i.index, i.name])])).toEqual([
      ['Bisturí', [[1, 'Mango de bisturí N.° 3']]],
      [
        'Pinza',
        [
          [0, 'Pinza Kelly'],
          [2, 'Pinza de Moynihan'],
        ],
      ],
    ]);
  });

  it('un objeto compuesto va con la categoría de su primer instrumento y lleva el nombre de su leyenda', () => {
    const groups = chosenGroups([item('i-gasa', 'i-kelly')], CATALOG, ORDER);

    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('Accesorios');
    expect(groups[0].items[0].name).toBe('Gasa y Pinza Kelly');
  });

  it('un objeto sin instrumento del catálogo (solo suturas o sin componentes) va a «Sin clasificar», al final', () => {
    const groups = chosenGroups([item(null), item('i-kelly'), item()], CATALOG, ORDER);

    expect(groups.map((g) => g.category)).toEqual(['Pinza', UNCLASSIFIED]);
    expect(groups[1].items.map((i) => i.index)).toEqual([0, 2]);
  });

  it('un instrumento que el catálogo no conoce también es «Sin clasificar»', () => {
    expect(chosenGroups([item('desconocido')], CATALOG, ORDER)[0].category).toBe(UNCLASSIFIED);
  });

  it('sin objetos, sin grupos', () => {
    expect(chosenGroups([], CATALOG, ORDER)).toEqual([]);
  });
});

describe('usageDots', () => {
  it('3 si lo usan dos tercios o más, 2 si un tercio o más, 1 si menos', () => {
    expect(usageDots(3, 3)).toBe(3);
    expect(usageDots(2, 3)).toBe(3);
    expect(usageDots(1, 3)).toBe(2);
    expect(usageDots(1, 4)).toBe(1);
    expect(usageDots(1, 10)).toBe(1);
  });

  it('sin técnicas con las que comparar, 1', () => {
    expect(usageDots(0, 0)).toBe(1);
  });
});

describe('suggestions', () => {
  const technique = (
    id: string,
    specialty: string,
    ...items: (string | null)[][]
  ): CatalogTechnique => ({
    id,
    specialty,
    items: items.map((ids) => ({ components: ids.map((i) => ({ instrument_id: i })) })),
  });
  const TECHNIQUES = [
    technique('t-1', 'Cirugía general', ['i-kelly'], ['i-gasa']),
    technique('t-2', 'Cirugía general', ['i-kelly'], ['i-bis']),
    technique('t-3', 'Cirugía general', ['i-kelly', 'i-moy']),
    technique('t-4', 'Urología', ['i-moy']),
    technique('t-5', 'Cirugía general'),
    technique('t-edit', 'Cirugía general', ['i-bis'], ['i-bis']),
  ];

  const run = (present: string[] = []) =>
    suggestions('Cirugía general', 't-edit', TECHNIQUES, CATALOG, new Set(present));

  it('lo que usan las otras técnicas de la especialidad, de más a menos, con cuántas lo usan y de cuántas', () => {
    expect(run().map((s) => [s.instrument.name, s.uses, s.total])).toEqual([
      ['Pinza Kelly', 3, 3],
      ['Gasa', 1, 3],
      ['Mango de bisturí N.° 3', 1, 3],
      ['Pinza de Moynihan', 1, 3],
    ]);
  });

  it('la técnica que se edita no cuenta, ni las de otra especialidad, ni las que no tienen objetos', () => {
    expect(run()[0].total).toBe(3);
    // El mango solo lo usa la técnica que se edita y t-2
    expect(run().find((s) => s.instrument.id === 'i-bis')!.uses).toBe(1);
  });

  it('los empates se ordenan por nombre', () => {
    expect(
      run()
        .slice(1)
        .map((s) => s.instrument.name),
    ).toEqual(['Gasa', 'Mango de bisturí N.° 3', 'Pinza de Moynihan']);
  });

  it('no sugiere lo que la técnica ya tiene', () => {
    expect(run(['i-kelly']).map((s) => s.instrument.id)).not.toContain('i-kelly');
  });

  it('lleva sus puntos según cuántas la usan', () => {
    expect(run().map((s) => s.dots)).toEqual([3, 2, 2, 2]);
  });

  it('sin otras técnicas con objetos, no hay sugeridos', () => {
    expect(suggestions('Ortopedia', 't-edit', TECHNIQUES, CATALOG, new Set())).toEqual([]);
  });
});

describe('matchesInstrument', () => {
  it('sin búsqueda, todo coincide', () => {
    expect(matchesInstrument(KELLY, '')).toBe(true);
    expect(matchesInstrument(KELLY, '   ')).toBe(true);
  });

  it('por nombre, sin tildes ni mayúsculas', () => {
    expect(matchesInstrument(BISTURI, 'BISTURI')).toBe(true);
    expect(matchesInstrument(BISTURI, 'kelly')).toBe(false);
  });

  it('también por alias', () => {
    expect(matchesInstrument(MOYNIHAN, 'moninjan')).toBe(true);
    expect(matchesInstrument(KELLY, 'moninjan')).toBe(false);
  });
});

describe('categoryChips', () => {
  it('cada tipo con cuántos instrumentos tiene, en el orden de la API', () => {
    expect(categoryChips(CATALOG, '', ORDER).map((c) => [c.category, c.count])).toEqual([
      ['Accesorios', 1],
      ['Bisturí', 1],
      ['Pinza', 2],
    ]);
  });

  it('durante una búsqueda cuenta solo lo que coincide, y los tipos sin resultados pasan al final', () => {
    const chips = categoryChips(CATALOG, 'pinza', ORDER);

    expect(chips.map((c) => [c.category, c.count])).toEqual([
      ['Pinza', 2],
      ['Accesorios', 0],
      ['Bisturí', 0],
    ]);
  });

  it('un tipo que la API no lista pero algún instrumento trae se suma al final', () => {
    const extra = instrument('i-x', 'Otro', 'Especial');

    expect(categoryChips([...CATALOG, extra], '', ORDER).map((c) => c.category)).toEqual([
      'Accesorios',
      'Bisturí',
      'Pinza',
      'Especial',
    ]);
  });
});

describe('catalogGroups', () => {
  it('el catálogo por categoría, en el orden de la API y por nombre dentro de cada una', () => {
    const groups = catalogGroups(CATALOG, '', '', ORDER);

    expect(groups.map((g) => [g.category, g.instruments.map((i) => i.name)])).toEqual([
      ['Accesorios', ['Gasa']],
      ['Bisturí', ['Mango de bisturí N.° 3']],
      ['Pinza', ['Pinza de Moynihan', 'Pinza Kelly']],
    ]);
  });

  it('con un tipo elegido, solo ese', () => {
    expect(catalogGroups(CATALOG, '', 'Bisturí', ORDER).map((g) => g.category)).toEqual([
      'Bisturí',
    ]);
  });

  it('solo lo que coincide con la búsqueda, y un grupo sin coincidencias no está', () => {
    const groups = catalogGroups(CATALOG, 'kelly', '', ORDER);

    expect(groups.map((g) => g.category)).toEqual(['Pinza']);
    expect(groups[0].instruments.map((i) => i.name)).toEqual(['Pinza Kelly']);
  });

  it('sin coincidencias, sin grupos', () => {
    expect(catalogGroups(CATALOG, 'zzz', '', ORDER)).toEqual([]);
  });
});

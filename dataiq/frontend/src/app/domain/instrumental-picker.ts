import type { EditorItem } from './editor-content';
import { itemName } from './item-name';
import { plain } from './technique-search';

/** La categoría de un objeto sin instrumento del catálogo (solo suturas o sin componentes). */
export const UNCLASSIFIED = 'Sin clasificar';

/** Un instrumento del catálogo, con lo que el paso de instrumental necesita de él. */
export interface CatalogInstrument {
  id: string;
  name: string;
  category: string;
  aliases: readonly string[];
}

/** Una técnica publicada del catálogo, con los instrumentos de sus objetos. */
export interface CatalogTechnique {
  id: string;
  specialty: string;
  items: readonly { components: readonly { instrument_id: string | null }[] }[];
}

// ---------- Lo que hay en la técnica ----------

/** Los objetos de los que solo importan los instrumentos de sus componentes. */
type WithInstruments = { readonly components: readonly { instrument_id: string | null }[] };

/** Los instrumentos que están en esos objetos: los que son componente de alguno. */
export function instrumentIdsIn(items: readonly WithInstruments[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    for (const component of item.components) {
      if (component.instrument_id !== null) ids.add(component.instrument_id);
    }
  }
  return ids;
}

/**
 * El objeto que crea «Agregar» en el paso de instrumental: el instrumento como único componente, con su
 * nombre como texto de la fuente, y sin mesa, número ni celdas (la casilla de las mesas lo ubica).
 */
export function newInstrumentItem(instrument: Pick<CatalogInstrument, 'id' | 'name'>): EditorItem {
  return {
    zone_id: null,
    legend_number: null,
    source_text: instrument.name,
    components: [{ instrument_id: instrument.id, suture_id: null, name: instrument.name }],
    cells: [],
  };
}

/** Los objetos con el instrumento sumado al final. Si ya está en la técnica no se suma otra vez. */
export function addInstrument(
  items: readonly EditorItem[],
  instrument: Pick<CatalogInstrument, 'id' | 'name'>,
): EditorItem[] {
  if (instrumentIdsIn(items).has(instrument.id)) return [...items];
  return [...items, newInstrumentItem(instrument)];
}

/**
 * La posición del objeto que «En la técnica» del catálogo puede quitar: el único objeto que es solo ese
 * instrumento. `-1` si no hay ninguno (solo está dentro de uno compuesto, como «compresa con
 * portaagujas») o si hay varios (p. ej. uno en cada mesa): tocar la fila no sabría cuál quitar, y se
 * quitan uno por uno desde la lista de lo elegido.
 */
export function soleOwnItem(items: readonly WithInstruments[], instrumentId: string): number {
  const own = items.flatMap((item, index) =>
    item.components.length === 1 && item.components[0].instrument_id === instrumentId
      ? [index]
      : [],
  );
  return own.length === 1 ? own[0] : -1;
}

/** Un grupo de «En esta técnica»: una categoría con sus objetos. */
export interface ChosenGroup {
  category: string;
  items: { item: EditorItem; index: number; name: string }[];
}

/** Las categorías en el orden en que las da la API, y al final las que no están en ella. */
function rank(categoryOrder: readonly string[], category: string): number {
  const index = categoryOrder.indexOf(category);
  if (category === UNCLASSIFIED) return categoryOrder.length + 1;
  return index === -1 ? categoryOrder.length : index;
}

/**
 * Los objetos de la técnica agrupados por la categoría de su primer instrumento, por el nombre de su
 * leyenda (`itemName`) y en el orden en que están. Uno sin instrumento del catálogo va a «Sin clasificar».
 * `index` es su posición en la lista de objetos, para quitarlo.
 */
export function chosenGroups(
  items: readonly EditorItem[],
  instruments: readonly CatalogInstrument[],
  categoryOrder: readonly string[],
): ChosenGroup[] {
  const byId = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  const groups = new Map<string, ChosenGroup>();
  items.forEach((item, index) => {
    const first = item.components
      .map((component) => (component.instrument_id ? byId.get(component.instrument_id) : undefined))
      .find((instrument) => instrument !== undefined);
    const category = first?.category ?? UNCLASSIFIED;
    const group = groups.get(category) ?? { category, items: [] };
    groups.set(category, group);
    group.items.push({
      item,
      index,
      name: itemName(
        item.components.map((component) => component.name),
        item.source_text,
      ),
    });
  });
  return [...groups.values()].sort(
    (a, b) => rank(categoryOrder, a.category) - rank(categoryOrder, b.category),
  );
}

// ---------- Sugeridos ----------

/** Cuántos puntos lleva un sugerido: 3 si lo usan dos tercios o más de las otras técnicas, 2 si un tercio o más, si no 1. */
export function usageDots(uses: number, total: number): 1 | 2 | 3 {
  if (total <= 0) return 1;
  const share = uses / total;
  if (share >= 2 / 3) return 3;
  if (share >= 1 / 3) return 2;
  return 1;
}

export interface Suggestion {
  instrument: CatalogInstrument;
  /** Cuántas de las otras técnicas de la especialidad lo usan. */
  uses: number;
  /** Cuántas otras técnicas de la especialidad tienen objetos con los que comparar. */
  total: number;
  dots: 1 | 2 | 3;
}

/**
 * Lo que usan las otras técnicas publicadas de la misma especialidad y la técnica que se edita todavía no
 * tiene, de más a menos técnicas que lo usan y, si empatan, por nombre. La técnica que se edita no cuenta
 * (aunque tenga una versión publicada), ni tampoco las que no tienen objetos: no hay con qué comparar.
 */
export function suggestions(
  specialty: string,
  techniqueId: string,
  techniques: readonly CatalogTechnique[],
  instruments: readonly CatalogInstrument[],
  present: ReadonlySet<string>,
): Suggestion[] {
  const others = techniques.filter(
    (technique) =>
      technique.specialty === specialty &&
      technique.id !== techniqueId &&
      technique.items.length > 0,
  );
  const total = others.length;
  const uses = new Map<string, number>();
  for (const technique of others) {
    for (const id of instrumentIdsIn(technique.items)) {
      uses.set(id, (uses.get(id) ?? 0) + 1);
    }
  }
  return instruments
    .filter((instrument) => uses.has(instrument.id) && !present.has(instrument.id))
    .map((instrument) => {
      const count = uses.get(instrument.id) ?? 0;
      return { instrument, uses: count, total, dots: usageDots(count, total) };
    })
    .sort(
      (a, b) =>
        b.uses - a.uses ||
        a.instrument.name.localeCompare(b.instrument.name, 'es', { sensitivity: 'base' }),
    );
}

// ---------- El catálogo ----------

/** Si la búsqueda coincide con el nombre del instrumento o con alguno de sus alias (sin tildes ni mayúsculas). */
export function matchesInstrument(instrument: CatalogInstrument, query: string): boolean {
  const needle = plain(query.trim());
  if (needle === '') return true;
  return [instrument.name, ...instrument.aliases].some((text) => plain(text).includes(needle));
}

export interface CategoryChip {
  category: string;
  /** Cuántos instrumentos de la categoría coinciden con la búsqueda. */
  count: number;
}

/**
 * Los tipos del filtro, con cuántos instrumentos coinciden con la búsqueda en cada uno. Durante una
 * búsqueda, los que no tienen resultados pasan al final de la fila.
 */
export function categoryChips(
  instruments: readonly CatalogInstrument[],
  query: string,
  categoryOrder: readonly string[],
): CategoryChip[] {
  const counts = new Map<string, number>(categoryOrder.map((category) => [category, 0]));
  for (const instrument of instruments) {
    const current = counts.get(instrument.category) ?? 0;
    counts.set(instrument.category, current + (matchesInstrument(instrument, query) ? 1 : 0));
  }
  const chips = [...counts].map(([category, count]) => ({ category, count }));
  chips.sort((a, b) => rank(categoryOrder, a.category) - rank(categoryOrder, b.category));
  return query.trim() === ''
    ? chips
    : [...chips.filter((c) => c.count > 0), ...chips.filter((c) => c.count === 0)];
}

export interface CatalogGroup {
  category: string;
  instruments: CatalogInstrument[];
}

/**
 * El catálogo por categoría, solo con lo que coincide con la búsqueda, dentro del tipo elegido (`''` es
 * todos). Sin coincidencias, el grupo no está. Dentro de cada categoría, por nombre.
 */
export function catalogGroups(
  instruments: readonly CatalogInstrument[],
  query: string,
  category: string,
  categoryOrder: readonly string[],
): CatalogGroup[] {
  const groups = new Map<string, CatalogInstrument[]>();
  for (const instrument of instruments) {
    if (category !== '' && instrument.category !== category) continue;
    if (!matchesInstrument(instrument, query)) continue;
    groups.set(instrument.category, [...(groups.get(instrument.category) ?? []), instrument]);
  }
  return [...groups]
    .map(([name, list]) => ({
      category: name,
      instruments: list.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    }))
    .sort((a, b) => rank(categoryOrder, a.category) - rank(categoryOrder, b.category));
}

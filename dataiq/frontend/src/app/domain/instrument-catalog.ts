import { UNCLASSIFIED } from './instrumental-picker';
import type { Table, TableItem } from './table';
import { highlight, plain, type Segment } from './technique-search';

/*
 * El catálogo de instrumental del revisor (Fase 7 de `dataiq/docs/checklist-frontend.md`, Resuelto 62):
 * el índice por categoría, «Dónde va» (calculado con `GET /catalog/full`, Resuelto 19), y lo que se
 * guarda al crear o editar. Todo es puro: la pantalla solo lo pinta.
 */

/** Un instrumento tal como lo entrega la API. */
export interface CatalogEntry {
  id: string;
  name: string;
  /** El nombre de su categoría. */
  category: string;
  description: string | null;
  description_source: string | null;
  aliases: readonly string[];
}

/** Una categoría del catálogo. */
export interface CatalogCategory {
  id: string;
  name: string;
}

// ---------- Dónde va ----------

/** Una técnica publicada con lo que hace falta para saber en qué mesas está cada instrumento. */
export interface TechniqueUse {
  id: string;
  name: string;
  specialty: string;
  /** Sus objetos, con los instrumentos de sus componentes. */
  items: readonly { id: string; components: readonly { instrument_id: string | null }[] }[];
  /** Sus mesas dibujables, con sus objetos (`toTables()`). */
  tables: readonly Table[];
}

/** El lugar de un instrumento: la técnica, su mesa y el objeto que lo lleva. */
export interface Placement {
  techniqueId: string;
  technique: string;
  specialty: string;
  table: Table;
  item: TableItem;
}

/**
 * Dónde va cada instrumento: por el `id` del instrumento, sus lugares en las mesas de las técnicas
 * publicadas, por técnica y por mesa. Solo cuenta un objeto con celdas: uno sin lugar en la mesa
 * (el listado de instrumental) no es un «dónde va». Un objeto de varios componentes cuenta para cada
 * uno de sus instrumentos.
 */
export function placementIndex(techniques: readonly TechniqueUse[]): Map<string, Placement[]> {
  const index = new Map<string, Placement[]>();
  for (const technique of techniques) {
    const instrumentsOf = new Map(
      technique.items.map((item) => [
        item.id,
        new Set(
          item.components.flatMap((c) => (c.instrument_id === null ? [] : [c.instrument_id])),
        ),
      ]),
    );
    for (const table of technique.tables) {
      for (const item of table.items) {
        if (item.cells.length === 0) continue;
        for (const instrumentId of instrumentsOf.get(item.id) ?? []) {
          const list = index.get(instrumentId) ?? [];
          list.push({
            techniqueId: technique.id,
            technique: technique.name,
            specialty: technique.specialty,
            table,
            item,
          });
          index.set(instrumentId, list);
        }
      }
    }
  }
  for (const list of index.values()) {
    list.sort(
      (a, b) =>
        a.technique.localeCompare(b.technique, 'es') ||
        a.table.name.localeCompare(b.table.name, 'es'),
    );
  }
  return index;
}

/** Cuántas técnicas distintas tienen al instrumento en alguna mesa. */
export function techniqueCount(placements: readonly Placement[]): number {
  return new Set(placements.map((placement) => placement.techniqueId)).size;
}

/** Los nombres de las técnicas donde va, sin repetir, en orden alfabético. */
export function techniqueNames(placements: readonly Placement[]): string[] {
  return [...new Set(placements.map((placement) => placement.technique))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
}

/** Los lugares agrupados por especialidad: en el orden de `specialties` y, al final, las que no estén. */
export function placementsBySpecialty(
  placements: readonly Placement[],
  specialties: readonly string[],
): { specialty: string; placements: Placement[] }[] {
  const names = [...specialties, ...new Set(placements.map((p) => p.specialty))];
  return [...new Set(names)]
    .map((specialty) => ({
      specialty,
      placements: placements.filter((placement) => placement.specialty === specialty),
    }))
    .filter((group) => group.placements.length > 0);
}

/** Lo que dice bajo el nombre: «En 3 técnicas · 4 mesas», o que todavía no está en ninguna. */
export function usageSummary(placements: readonly Placement[]): string {
  if (placements.length === 0) return 'Todavía no está en ninguna mesa';
  const techniques = techniqueCount(placements);
  const tables = placements.length;
  return `En ${techniques} ${techniques === 1 ? 'técnica' : 'técnicas'} · ${tables} ${tables === 1 ? 'mesa' : 'mesas'}`;
}

/**
 * Lo que dice la barra de guardar: en qué técnicas publicadas se verá el cambio, todas por nombre. Un
 * instrumento nuevo no está en ninguna.
 */
export function impactText(names: readonly string[], isNew: boolean): string {
  if (names.length > 0) {
    return `Este cambio se verá en ${names.length} ${names.length === 1 ? 'técnica publicada' : 'técnicas publicadas'}: ${names.join(', ')}.`;
  }
  return isNew
    ? 'Queda en el catálogo para usarlo en las técnicas.'
    : 'Todavía no está en ninguna técnica publicada.';
}

/** El aviso al guardar. */
export function savedNotice(isNew: boolean, techniques: number): string {
  if (isNew) return 'Instrumento agregado al catálogo.';
  if (techniques === 0) return 'Cambios guardados.';
  return `Cambios guardados · se ven en ${techniques} ${techniques === 1 ? 'técnica' : 'técnicas'}.`;
}

// ---------- El índice ----------

/** Una fila del índice. */
export interface IndexItem {
  id: string;
  name: string;
  /** El nombre partido en lo que coincide con la búsqueda y lo demás. */
  segments: Segment[];
  /** En cuántas técnicas va (en mesas). */
  techniques: number;
  /** El alias por el que coincidió la búsqueda, si no fue por el nombre. */
  viaAlias: string | null;
}

/** Una categoría del índice, con los instrumentos que quedan. */
export interface IndexGroup {
  category: string;
  items: IndexItem[];
}

/** Los nombres de las categorías en orden alfabético, con «Sin clasificar» al final. */
export function sortedCategoryNames(names: Iterable<string>): string[] {
  return [...new Set(names)].sort((a, b) =>
    a === UNCLASSIFIED ? 1 : b === UNCLASSIFIED ? -1 : a.localeCompare(b, 'es'),
  );
}

/**
 * El índice por categoría (Resuelto 62): las categorías en orden alfabético con «Sin clasificar» al final y,
 * en cada una, los instrumentos por nombre. La búsqueda encuentra por nombre o por alias, sin tildes ni
 * mayúsculas; las categorías sin resultados no salen. Cada fila trae su cifra de técnicas.
 */
export function indexGroups(
  instruments: readonly CatalogEntry[],
  techniquesOf: (id: string) => number,
  query: string,
): IndexGroup[] {
  const needle = plain(query.trim());
  const groups: IndexGroup[] = [];
  for (const category of sortedCategoryNames(instruments.map((i) => i.category))) {
    const items = instruments
      .filter((instrument) => instrument.category === category)
      .flatMap((instrument): IndexItem[] => {
        const byName = needle === '' || plain(instrument.name).includes(needle);
        const alias = byName
          ? undefined
          : instrument.aliases.find((a) => plain(a).includes(needle));
        if (!byName && alias === undefined) return [];
        return [
          {
            id: instrument.id,
            name: instrument.name,
            segments: highlight(instrument.name, query),
            techniques: techniquesOf(instrument.id),
            viaAlias: alias ?? null,
          },
        ];
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (items.length > 0) groups.push({ category, items });
  }
  return groups;
}

/**
 * El primer instrumento del índice sin búsqueda (el primero por nombre de la primera categoría): la entrada
 * que se abre cuando la URL no elige una. Se calcula sin armar el índice entero.
 */
export function firstInstrumentId(instruments: readonly CatalogEntry[]): string | undefined {
  const [category] = sortedCategoryNames(instruments.map((instrument) => instrument.category));
  let first: CatalogEntry | undefined;
  for (const instrument of instruments) {
    if (instrument.category !== category) continue;
    if (!first || instrument.name.localeCompare(first.name, 'es') < 0) first = instrument;
  }
  return first?.id;
}

// ---------- Crear y editar ----------

/** Lo que se escribe al crear o editar una entrada. */
export interface EntryDraft {
  name: string;
  categoryId: string;
  description: string;
  source: string;
  aliases: readonly string[];
}

/** El borrador de una entrada que ya existe, o uno vacío para un instrumento nuevo. */
export function draftOf(
  entry: CatalogEntry | null,
  categories: readonly CatalogCategory[],
): EntryDraft {
  if (entry === null) {
    return { name: '', categoryId: '', description: '', source: '', aliases: [] };
  }
  return {
    name: entry.name,
    categoryId: categories.find((category) => category.name === entry.category)?.id ?? '',
    description: entry.description ?? '',
    source: entry.description_source ?? '',
    aliases: [...entry.aliases],
  };
}

/**
 * El instrumento que ya tiene ese texto como nombre o como alias, sin tildes ni mayúsculas, sin contar a
 * `exceptId` (el que se edita). Dos instrumentos no pueden compartir un nombre.
 */
export function ownerOf(
  instruments: readonly CatalogEntry[],
  text: string,
  exceptId: string | null,
): CatalogEntry | null {
  const needle = plain(text.trim());
  if (needle === '') return null;
  return (
    instruments.find(
      (instrument) =>
        instrument.id !== exceptId &&
        (plain(instrument.name) === needle || instrument.aliases.some((a) => plain(a) === needle)),
    ) ?? null
  );
}

/** Hay descripción y falta su fuente: la API no la acepta sin ella (`description_source`). */
export function missingSource(draft: EntryDraft): boolean {
  return draft.description.trim() !== '' && draft.source.trim() === '';
}

/** Se puede guardar: tiene nombre y categoría, el nombre no es de otro y la descripción trae su fuente. */
export function canSave(draft: EntryDraft, nameOwner: CatalogEntry | null): boolean {
  return (
    draft.name.trim() !== '' &&
    draft.categoryId !== '' &&
    nameOwner === null &&
    !missingSource(draft)
  );
}

/** Lo que recibe `POST /instruments`. */
export interface InstrumentCreateBody {
  name: string;
  category_id: string;
  description?: string;
  description_source?: string;
}

/** Lo que recibe `PATCH /instruments/{id}`: solo lo que cambió. */
export interface InstrumentUpdateBody {
  name?: string;
  category_id?: string;
  description?: string;
  description_source?: string;
  aliases?: string[];
}

/** El cuerpo para crear: sin descripción ni fuente si no se escribió descripción. Los alias van después, con un `PATCH`. */
export function toCreate(draft: EntryDraft): InstrumentCreateBody {
  const description = draft.description.trim();
  return {
    name: draft.name.trim(),
    category_id: draft.categoryId,
    ...(description === '' ? {} : { description, description_source: draft.source.trim() }),
  };
}

/**
 * Lo que hay que mandar para pasar de `entry` a `draft`: solo lo que cambió (la API deja igual lo que no
 * recibe). Vaciar la descripción manda `''`, porque la API no admite `null` para borrarla; los alias, si
 * cambiaron, van completos, porque reemplazan la lista. Vacío si nada cambió.
 */
export function toUpdate(
  entry: CatalogEntry,
  draft: EntryDraft,
  categories: readonly CatalogCategory[],
): InstrumentUpdateBody {
  const body: InstrumentUpdateBody = {};
  const name = draft.name.trim();
  if (name !== entry.name) body.name = name;
  const category = categories.find((candidate) => candidate.id === draft.categoryId);
  if (category && category.name !== entry.category) body.category_id = category.id;
  const description = draft.description.trim();
  const source = draft.source.trim();
  if (description !== (entry.description ?? '')) {
    body.description = description;
    if (description !== '') body.description_source = source;
  } else if (description !== '' && source !== (entry.description_source ?? '')) {
    body.description_source = source;
  }
  const aliases = draft.aliases.map((alias) => alias.trim()).filter((alias) => alias !== '');
  if (aliases.join('\n') !== entry.aliases.join('\n')) body.aliases = aliases;
  return body;
}

import type { EditorCell, EditorContent, EditorItem, EditorZone } from './editor-content';
import { itemName } from './item-name';
import { sutureRow } from './instrumental-sheet';
import { editorTable, itemsOfZone, placeText } from './table-editor';
import { ZONE_NAMES, type Table } from './table';
import { plain } from './technique-search';

/*
 * La diferencia entre la versión publicada y la propuesta, calculada en el cliente (Fase 7 de
 * `dataiq/docs/checklist-frontend.md`, Resuelto 59): la API entrega las dos versiones completas y
 * no dice qué cambió. Todo es puro y trabaja sobre el `EditorContent` de cada una. Sin versión
 * publicada (la propuesta es la versión 1) no hay con qué comparar: nada es un cambio.
 */

// ---------- Datos clínicos ----------

/** Qué le pasó a un campo: pasó de vacío a tener texto, cambió o quedó vacío. */
export type FieldChange = 'added' | 'modified' | 'removed';

/** Una fila de la tabla de Datos clínicos. Un valor vacío es `''`. */
export interface ClinicalRow {
  key: string;
  label: string;
  published: string;
  proposed: string;
  change: FieldChange | null;
}

/** Un campo comparable: lo que se muestra y la llave con que se compara (sin tildes, mayúsculas ni orden). */
interface Reading {
  text: string;
  compare: string;
}

type FieldReader = (content: EditorContent) => Reading;

const textField =
  (field: keyof EditorContent & string): FieldReader =>
  (content) => {
    const text = ((content[field] as string | null) ?? '').trim();
    return { text, compare: text };
  };

/** Los nombres de una lista, separados por comas; se comparan sin tildes ni mayúsculas ni orden. */
const namesField =
  (field: 'equipment' | 'devices'): FieldReader =>
  (content) => {
    const names = content[field].map((name) => name.trim()).filter((name) => name !== '');
    return {
      text: names.join(', '),
      compare: names.map(plain).sort().join('\n'),
    };
  };

/** Una fila por sutura con su plano: «Piel · Seda 2/0, aguja cortante». Las filas sin sutura no cuentan. */
const suturesField: FieldReader = (content) => {
  const rows = content.sutures
    .filter((suture) => suture.name.trim() !== '')
    .map((suture) => {
      const plane = suture.plane.trim();
      const { text } = sutureRow({
        plane: null,
        name: suture.name.trim(),
        gauge: suture.gauge.trim() || null,
        needleType: suture.needle_type.trim() || null,
      });
      return plane ? `${plane} · ${text}` : text;
    });
  return { text: rows.join('\n'), compare: rows.map(plain).sort().join('\n') };
};

/** Los campos de Datos clínicos, en el orden en que se muestran, con los nombres del editor. */
const CLINICAL_FIELDS: readonly { key: string; label: string; read: FieldReader }[] = [
  { key: 'description', label: 'Para qué sirve', read: textField('description') },
  { key: 'indications', label: 'Indicaciones', read: textField('indications') },
  { key: 'complications', label: 'Complicaciones', read: textField('complications') },
  { key: 'surgical_technique', label: 'Técnica quirúrgica', read: textField('surgical_technique') },
  { key: 'cups_code', label: 'Código CUPS', read: textField('cups_code') },
  { key: 'anesthesia', label: 'Anestesia', read: textField('anesthesia') },
  { key: 'drapes', label: 'Ropa', read: textField('drapes') },
  { key: 'patient_position', label: 'Posición del paciente', read: textField('patient_position') },
  { key: 'source', label: 'Fuente', read: textField('source') },
  { key: 'sutures', label: 'Suturas', read: suturesField },
  { key: 'equipment', label: 'Equipos biomédicos', read: namesField('equipment') },
  { key: 'devices', label: 'Equipo médico-quirúrgico', read: namesField('devices') },
];

/**
 * Todos los campos de Datos clínicos con su valor publicado y propuesto, y qué le pasó a cada uno.
 * Un texto en blanco cuenta como vacío; las listas (suturas, equipos) se comparan sin distinguir
 * orden, tildes ni mayúsculas.
 */
export function clinicalDiff(
  published: EditorContent | null,
  proposed: EditorContent,
): ClinicalRow[] {
  return CLINICAL_FIELDS.map(({ key, label, read }) => {
    const before = published ? read(published) : { text: '', compare: '' };
    const after = read(proposed);
    let change: FieldChange | null = null;
    if (published) {
      if (before.compare === '' && after.compare !== '') change = 'added';
      else if (before.compare !== '' && after.compare === '') change = 'removed';
      else if (before.compare !== after.compare) change = 'modified';
    }
    return { key, label, published: before.text, proposed: after.text, change };
  });
}

// ---------- Instrumental ----------

/** Un objeto que solo está en una de las dos versiones. */
export interface InstrumentalChange {
  kind: 'added' | 'removed';
  name: string;
}

/** Los objetos de la técnica por el nombre de su leyenda, y en qué difieren de la publicada. */
export interface InstrumentalDiff {
  /** Los objetos de la propuesta, incluidos los que no tienen lugar en la mesa. */
  objects: string[];
  /** Quitados primero y luego agregados, cada uno por su nombre. */
  changes: InstrumentalChange[];
}

function objectNames(content: EditorContent): string[] {
  return content.items.map((item) =>
    itemName(
      item.components.map((component) => component.name),
      item.source_text,
    ),
  );
}

/** Lo que está en `from` y no en `other`, contando repeticiones y sin distinguir tildes ni mayúsculas. */
function onlyIn(from: readonly string[], other: readonly string[]): string[] {
  const remaining = new Map<string, number>();
  for (const name of other) remaining.set(plain(name), (remaining.get(plain(name)) ?? 0) + 1);
  return from.filter((name) => {
    const left = remaining.get(plain(name)) ?? 0;
    if (left === 0) return true;
    remaining.set(plain(name), left - 1);
    return false;
  });
}

/** Qué objetos se agregaron o se quitaron, comparados por el nombre de la leyenda. */
export function instrumentalDiff(
  published: EditorContent | null,
  proposed: EditorContent,
): InstrumentalDiff {
  const after = objectNames(proposed);
  if (!published) return { objects: after, changes: [] };
  const before = objectNames(published);
  return {
    objects: after,
    changes: [
      ...onlyIn(before, after).map((name): InstrumentalChange => ({ kind: 'removed', name })),
      ...onlyIn(after, before).map((name): InstrumentalChange => ({ kind: 'added', name })),
    ],
  };
}

// ---------- Mesas ----------

/**
 * Cómo está una mesa en una versión: la lleva con su tamaño (`carried`), no la lleva (`not_carried`,
 * `used: false`) o la versión no dice nada de ella o la usa sin tamaño (`none`; Resuelto 37).
 */
export type ZoneState = 'carried' | 'not_carried' | 'none';

/** Una mesa de una versión: su estado y, si la lleva, lo que dibuja el diagrama. */
export interface ZoneView {
  state: ZoneState;
  /** Solo en `carried`. */
  table: Table | null;
  /** Los objetos de la mesa (con o sin lugar). */
  objects: number;
}

/** Qué le pasó a un objeto de la mesa. */
export type TableChangeKind = 'moved' | 'modified' | 'added' | 'removed' | 'resized';

/** Un cambio de la mesa. El de tamaño o estado de la mesa (`resized`) no es de un objeto y no lleva número. */
export interface TableChange {
  key: string;
  kind: TableChangeKind;
  /** El número de la leyenda del objeto; `null` si no tiene o es un cambio de la mesa. */
  number: number | null;
  /** El nombre de la leyenda; vacío en un cambio de la mesa. */
  name: string;
  /** «Fila 4 · Columna 4 → Fila 4 · Columna 3», «Agregado en…», «Quitado de…», «La mesa pasa de…». */
  detail: string;
  /** Las celdas que ocupaba en la publicada y las que ocupa en la propuesta. */
  fromCells: EditorCell[];
  toCells: EditorCell[];
}

export interface ZoneDiff {
  /** `null` si no hay versión publicada. */
  published: ZoneView | null;
  proposed: ZoneView;
  changes: TableChange[];
}

function zoneRow(content: EditorContent, zoneName: string): EditorZone | undefined {
  return content.zones.find((zone) => zone.zone === zoneName);
}

function zoneView(content: EditorContent, zoneName: string): ZoneView {
  const zone = zoneRow(content, zoneName);
  if (!zone) return { state: 'none', table: null, objects: 0 };
  const objects = itemsOfZone(content.items, zone.zone_id).length;
  if (!zone.used) return { state: 'not_carried', table: null, objects };
  if (zone.rows === null || zone.columns === null) return { state: 'none', table: null, objects };
  return { state: 'carried', table: editorTable(zone, content.items), objects };
}

/** Las celdas de un objeto como llave para compararlas. */
function cellsKey(cells: readonly EditorCell[]): string {
  return cells
    .map((cell) => `${cell.row},${cell.column}`)
    .sort()
    .join(';');
}

function componentsKey(item: EditorItem): string {
  return item.components
    .map((component) => plain(component.name))
    .sort()
    .join('\n');
}

function nameOf(item: EditorItem): string {
  return itemName(
    item.components.map((component) => component.name),
    item.source_text,
  );
}

/** «Fila 4 · Columna 4» (la primera celda) o «Sin ubicar»; con varias celdas, cuántas son. */
function placeLabel(item: EditorItem): string {
  const place = placeText(item);
  return item.cells.length > 1 ? `${place} (${item.cells.length} celdas)` : place;
}

function sizeText(view: ZoneView): string {
  if (view.state === 'carried') return `${view.table!.rows} × ${view.table!.columns}`;
  return view.state === 'not_carried' ? 'no llevarse' : 'sin arreglo';
}

function toChange(
  kind: TableChangeKind,
  before: EditorItem | undefined,
  after: EditorItem | undefined,
): TableChange {
  const item = (after ?? before)!;
  const move = before && after ? `${placeLabel(before)} → ${placeLabel(after)}` : '';
  let detail: string;
  if (kind === 'added') {
    detail =
      after!.cells.length === 0 ? 'Agregado sin ubicar' : `Agregado en ${placeLabel(after!)}`;
  } else if (kind === 'removed') {
    detail = before!.cells.length === 0 ? 'Quitado' : `Quitado de ${placeLabel(before!)}`;
  } else if (kind === 'modified') {
    detail =
      cellsKey(before!.cells) === cellsKey(after!.cells) ? 'Modificado' : `Modificado · ${move}`;
  } else {
    detail = move;
  }
  return {
    key: `${kind}-${item.legend_number ?? nameOf(item)}`,
    kind,
    number: item.legend_number,
    name: nameOf(item),
    detail,
    fromCells: before?.cells ?? [],
    toCells: after?.cells ?? [],
  };
}

/** Los cambios de los objetos: los de la misma mesa y número son el mismo; los que no tienen número, el mismo nombre. */
function itemChanges(
  published: readonly EditorItem[],
  proposed: readonly EditorItem[],
): TableChange[] {
  const changes: TableChange[] = [];
  const unmatched = [...published];
  const pairWith = (candidate: EditorItem): EditorItem | undefined => {
    const index = unmatched.findIndex((other) =>
      candidate.legend_number !== null
        ? other.legend_number === candidate.legend_number
        : other.legend_number === null && plain(nameOf(other)) === plain(nameOf(candidate)),
    );
    return index === -1 ? undefined : unmatched.splice(index, 1)[0];
  };
  for (const after of proposed) {
    const before = pairWith(after);
    if (!before) changes.push(toChange('added', undefined, after));
    else if (cellsKey(before.cells) !== cellsKey(after.cells))
      changes.push(
        componentsKey(before) === componentsKey(after)
          ? toChange('moved', before, after)
          : toChange('modified', before, after),
      );
    else if (componentsKey(before) !== componentsKey(after))
      changes.push(toChange('modified', before, after));
  }
  for (const before of unmatched) changes.push(toChange('removed', before, undefined));
  changes.sort(
    (a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.name.localeCompare(b.name, 'es'),
  );
  // Dos objetos sin número con el mismo nombre (dos «Gasa») dan la misma clave: la segunda lleva «-2»
  const seen = new Map<string, number>();
  return changes.map((change) => {
    const count = (seen.get(change.key) ?? 0) + 1;
    seen.set(change.key, count);
    return count === 1 ? change : { ...change, key: `${change.key}-${count}` };
  });
}

/**
 * Qué cambió en una mesa (la de Mayo o la de reserva, por su nombre). Un cambio es un objeto movido,
 * modificado, agregado o quitado, o que la mesa cambie de tamaño o deje de llevarse. Si alguna de las
 * dos no está armada (`carried`) no se comparan los objetos, solo el cambio de la mesa.
 */
export function zoneDiff(
  published: EditorContent | null,
  proposed: EditorContent,
  zoneName: string,
): ZoneDiff {
  const after = zoneView(proposed, zoneName);
  if (!published) return { published: null, proposed: after, changes: [] };
  const before = zoneView(published, zoneName);

  const sameSize = before.state === after.state && sizeText(before) === sizeText(after);
  if (!sameSize) {
    const change: TableChange = {
      key: 'resized',
      kind: 'resized',
      number: null,
      name: '',
      detail: `La mesa pasa de ${sizeText(before)} a ${sizeText(after)}`,
      fromCells: [],
      toCells: [],
    };
    // Con el tamaño distinto, los objetos se comparan solo si las dos se arman
    const both = before.state === 'carried' && after.state === 'carried';
    return {
      published: before,
      proposed: after,
      changes: [change, ...(both ? objectChanges(published, proposed, zoneName) : [])],
    };
  }
  return {
    published: before,
    proposed: after,
    changes: after.state === 'carried' ? objectChanges(published, proposed, zoneName) : [],
  };
}

function objectChanges(
  published: EditorContent,
  proposed: EditorContent,
  zoneName: string,
): TableChange[] {
  const before = zoneRow(published, zoneName)!;
  const after = zoneRow(proposed, zoneName)!;
  return itemChanges(
    itemsOfZone(published.items, before.zone_id).map(({ item }) => item),
    itemsOfZone(proposed.items, after.zone_id).map(({ item }) => item),
  );
}

// ---------- Toda la revisión ----------

/** La diferencia de las cuatro secciones; `isNew` si no hay versión publicada con qué comparar. */
export interface ReviewDiff {
  isNew: boolean;
  clinical: ClinicalRow[];
  instrumental: InstrumentalDiff;
  mayo: ZoneDiff;
  reserve: ZoneDiff;
}

/** Las cuatro secciones de la propuesta frente a la publicada (`null` si es la versión 1). */
export function reviewDiff(published: EditorContent | null, proposed: EditorContent): ReviewDiff {
  return {
    isNew: published === null,
    clinical: clinicalDiff(published, proposed),
    instrumental: instrumentalDiff(published, proposed),
    mayo: zoneDiff(published, proposed, ZONE_NAMES.mayo),
    reserve: zoneDiff(published, proposed, ZONE_NAMES.reserve),
  };
}

/** Lo que dice la pestaña de una sección. */
export interface SectionNote {
  /** «2 cambios», «1 cambio», «sin cambios»; en una técnica nueva, cuánto hay («3 objetos»). */
  label: string;
  /** Hay cambios que contar: la pestaña los marca con el círculo `marca`. */
  highlight: boolean;
  /** Cuántos cambios, o `0` en una técnica nueva. */
  changes: number;
}

function changesNote(count: number): SectionNote {
  const label = count === 0 ? 'sin cambios' : count === 1 ? '1 cambio' : `${count} cambios`;
  return { label, highlight: count > 0, changes: count };
}

function elementsNote(count: number, one: string, many: string, none: string): SectionNote {
  const label = count === 0 ? none : count === 1 ? `1 ${one}` : `${count} ${many}`;
  return { label, highlight: false, changes: 0 };
}

/**
 * Lo que dice la pestaña de cada sección: cuántos cambios hay. En una técnica nueva no hay con qué
 * comparar y todo sería un cambio: dice cuánto hay de cada cosa (Resuelto 59).
 */
export function sectionNotes(
  diff: ReviewDiff,
): Record<'clinical' | 'instrumental' | 'mayo' | 'reserve', SectionNote> {
  if (diff.isNew) {
    return {
      clinical: elementsNote(
        diff.clinical.filter((row) => row.proposed !== '').length,
        'campo',
        'campos',
        'sin campos',
      ),
      instrumental: elementsNote(
        diff.instrumental.objects.length,
        'objeto',
        'objetos',
        'sin objetos',
      ),
      mayo: elementsNote(diff.mayo.proposed.objects, 'objeto', 'objetos', 'sin objetos'),
      reserve: elementsNote(diff.reserve.proposed.objects, 'objeto', 'objetos', 'sin objetos'),
    };
  }
  return {
    clinical: changesNote(diff.clinical.filter((row) => row.change !== null).length),
    instrumental: changesNote(diff.instrumental.changes.length),
    mayo: changesNote(diff.mayo.changes.length),
    reserve: changesNote(diff.reserve.changes.length),
  };
}

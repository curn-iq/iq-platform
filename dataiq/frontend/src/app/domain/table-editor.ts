import type { EditorItem, EditorZone } from './editor-content';
import { itemName } from './item-name';
import type { CatalogInstrument } from './instrumental-picker';
import { readingOrder, type Table, type TableCell } from './table';

/** Una mesa del catálogo: lo que `zones` de la versión necesita para nombrarla y crearla. */
export interface ZoneRef {
  id: string;
  name: string;
}

/** Las mesas de la versión y sus objetos: lo único que cambia el editor de las mesas. */
export interface TableData {
  zones: EditorZone[];
  items: EditorItem[];
}

/** El tamaño con el que nace una mesa que se arma (el de «Nueva técnica» en `DESIGN.md`). */
export const DEFAULT_ROWS = 4;
export const DEFAULT_COLUMNS = 6;
/** Lo mínimo y lo máximo de filas y de columnas que se pueden pedir. */
export const MIN_SIZE = 2;
export const MAX_SIZE = 10;

/** El tamaño pedido, sin pasarse de lo mínimo ni de lo máximo. */
export function clampSize(size: number): number {
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(size)));
}

// ---------- La mesa ----------

/**
 * Las mesas con esa mesa llevada y con tamaño: si no está en la versión se suma con el tamaño inicial, y si
 * estaba como «no lleva» (`used: false`) pasa a llevarse, también con el tamaño inicial. Una que ya se
 * lleva no cambia.
 */
export function ensureZone(zones: readonly EditorZone[], ref: ZoneRef): EditorZone[] {
  const current = zones.find((zone) => zone.zone_id === ref.id);
  if (current?.used && current.rows !== null && current.columns !== null) return [...zones];
  const carried: EditorZone = {
    zone_id: ref.id,
    zone: ref.name,
    used: true,
    rows: DEFAULT_ROWS,
    columns: DEFAULT_COLUMNS,
  };
  return current
    ? zones.map((zone) => (zone.zone_id === ref.id ? carried : zone))
    : [...zones, carried];
}

/** Los objetos de una mesa con su posición en la lista, por número (los que no tienen, al final). */
export function itemsOfZone(
  items: readonly EditorItem[],
  zoneId: string,
): { item: EditorItem; index: number }[] {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.zone_id === zoneId)
    .sort(
      (a, b) =>
        (a.item.legend_number ?? Infinity) - (b.item.legend_number ?? Infinity) ||
        a.index - b.index,
    );
}

/** El siguiente número libre de la mesa: el mayor más uno. Cada mesa tiene su propia numeración. */
export function nextLegendNumber(items: readonly EditorItem[], zoneId: string): number {
  return (
    itemsOfZone(items, zoneId).reduce(
      (max, { item }) => Math.max(max, item.legend_number ?? 0),
      0,
    ) + 1
  );
}

/** Los instrumentos que ya están en la mesa: los que son componente de alguno de sus objetos. */
export function instrumentIdsInZone(items: readonly EditorItem[], zoneId: string): Set<string> {
  const ids = new Set<string>();
  for (const { item } of itemsOfZone(items, zoneId)) {
    for (const component of item.components) {
      if (component.instrument_id !== null) ids.add(component.instrument_id);
    }
  }
  return ids;
}

/**
 * Agrega un instrumento a la mesa. La mesa se crea si hace falta. Si el instrumento ya está en la mesa no
 * se repite (uno por instrumento y mesa). Si la técnica ya tiene un objeto sin mesa que es solo ese
 * instrumento (lo agregó el paso de instrumental), ese objeto pasa a la mesa en vez de duplicarse; si no,
 * se crea uno. El objeto entra con el siguiente número de la mesa y sin lugar.
 */
export function addObjectToZone(
  data: TableData,
  ref: ZoneRef,
  instrument: Pick<CatalogInstrument, 'id' | 'name'>,
): TableData {
  if (instrumentIdsInZone(data.items, ref.id).has(instrument.id)) return data;
  const zones = ensureZone(data.zones, ref);
  const number = nextLegendNumber(data.items, ref.id);
  const loose = data.items.findIndex(
    (item) =>
      item.zone_id === null &&
      item.components.length === 1 &&
      item.components[0].instrument_id === instrument.id,
  );
  if (loose !== -1) {
    return {
      zones,
      items: data.items.map((item, index) =>
        index === loose ? { ...item, zone_id: ref.id, legend_number: number, cells: [] } : item,
      ),
    };
  }
  const created: EditorItem = {
    zone_id: ref.id,
    legend_number: number,
    source_text: instrument.name,
    components: [{ instrument_id: instrument.id, suture_id: null, name: instrument.name }],
    cells: [],
  };
  return { zones, items: [...data.items, created] };
}

// ---------- Ubicar ----------

/** La posición del objeto que ocupa esa celda de la mesa, o `-1` si está vacía. */
export function occupantAt(
  items: readonly EditorItem[],
  zoneId: string,
  row: number,
  column: number,
): number {
  return items.findIndex(
    (item) =>
      item.zone_id === zoneId &&
      item.cells.some((cell) => cell.row === row && cell.column === column),
  );
}

function sameCells(cells: readonly TableCell[]): TableCell[] {
  return cells.map(({ row, column }) => ({ row, column }));
}

/**
 * Pone un objeto en una celda. Un objeto de una celda va a ella; si estaba ocupada, el que estaba pasa al
 * lugar que dejó (o a «sin ubicar» si el objeto no tenía lugar). Un objeto de varias celdas se traslada
 * entero, con su primera celda (en orden de lectura) en la elegida, y solo si cabe y las celdas de destino
 * están libres. Una celda fuera de la mesa, o un objeto que no es de esa mesa, no cambia nada.
 */
export function placeObject(
  data: TableData,
  zoneId: string,
  index: number,
  row: number,
  column: number,
): TableData {
  const zone = data.zones.find((candidate) => candidate.zone_id === zoneId);
  const item = data.items[index];
  if (!zone?.used || zone.rows === null || zone.columns === null) return data;
  if (!item || item.zone_id !== zoneId) return data;
  if (row < 1 || row > zone.rows || column < 1 || column > zone.columns) return data;

  const occupant = occupantAt(data.items, zoneId, row, column);

  if (item.cells.length <= 1) {
    if (occupant === index) return data;
    const other = occupant === -1 ? undefined : data.items[occupant];
    // Dos objetos de varias celdas no se intercambian: el intercambio solo mueve de a una celda
    if (other && other.cells.length > 1) return data;
    return {
      zones: data.zones,
      items: data.items.map((candidate, position) => {
        if (position === index) return { ...candidate, cells: [{ row, column }] };
        if (position === occupant) return { ...candidate, cells: sameCells(item.cells) };
        return candidate;
      }),
    };
  }

  const [anchor] = readingOrder(item.cells);
  const moved = item.cells.map((cell) => ({
    row: cell.row + (row - anchor.row),
    column: cell.column + (column - anchor.column),
  }));
  const fits = moved.every(
    (cell) =>
      cell.row >= 1 && cell.row <= zone.rows! && cell.column >= 1 && cell.column <= zone.columns!,
  );
  const free = moved.every((cell) => {
    const at = occupantAt(data.items, zoneId, cell.row, cell.column);
    return at === -1 || at === index;
  });
  if (!fits || !free) return data;
  return {
    zones: data.zones,
    items: data.items.map((candidate, position) =>
      position === index ? { ...candidate, cells: moved } : candidate,
    ),
  };
}

/** Deja vacía la celda: su objeto, entero, pasa a «sin ubicar» y sigue en la mesa. */
export function clearCell(data: TableData, zoneId: string, row: number, column: number): TableData {
  const occupant = occupantAt(data.items, zoneId, row, column);
  if (occupant === -1) return data;
  return {
    zones: data.zones,
    items: data.items.map((item, index) => (index === occupant ? { ...item, cells: [] } : item)),
  };
}

// ---------- Tamaño y «no lleva» ----------

/**
 * Cambia el tamaño de la mesa (de {@link MIN_SIZE} a {@link MAX_SIZE}), y la crea si hace falta. Los objetos
 * con alguna celda que queda fuera vuelven a «sin ubicar».
 */
export function resizeZone(
  data: TableData,
  ref: ZoneRef,
  rows: number,
  columns: number,
): TableData {
  const base = ensureZone(data.zones, ref);
  const newRows = clampSize(rows);
  const newColumns = clampSize(columns);
  return {
    zones: base.map((zone) =>
      zone.zone_id === ref.id ? { ...zone, rows: newRows, columns: newColumns } : zone,
    ),
    items: data.items.map((item) =>
      item.zone_id === ref.id &&
      item.cells.some((cell) => cell.row > newRows || cell.column > newColumns)
        ? { ...item, cells: [] }
        : item,
    ),
  };
}

/**
 * Dice que la técnica no lleva esta mesa: `used: false` y sin tamaño (la mesa se crea si no estaba). La API
 * no admite objetos en una mesa que no se lleva: los de esta pasan a no tener mesa, sin número ni celdas, y
 * siguen en el instrumental.
 */
export function markNotCarried(data: TableData, ref: ZoneRef): TableData {
  const dropped: EditorZone = {
    zone_id: ref.id,
    zone: ref.name,
    used: false,
    rows: null,
    columns: null,
  };
  const exists = data.zones.some((zone) => zone.zone_id === ref.id);
  return {
    zones: exists
      ? data.zones.map((zone) => (zone.zone_id === ref.id ? dropped : zone))
      : [...data.zones, dropped],
    items: data.items.map((item) =>
      item.zone_id === ref.id ? { ...item, zone_id: null, legend_number: null, cells: [] } : item,
    ),
  };
}

// ---------- Lo que se ve ----------

/** La mesa como la dibuja el diagrama: su tamaño y sus objetos (los sin lugar no se dibujan). */
export function editorTable(zone: EditorZone, items: readonly EditorItem[]): Table {
  return {
    zoneId: zone.zone_id,
    name: zone.zone,
    rows: zone.rows ?? DEFAULT_ROWS,
    columns: zone.columns ?? DEFAULT_COLUMNS,
    items: itemsOfZone(items, zone.zone_id).map(({ item, index }) => {
      const components = item.components.map((component) => component.name);
      return {
        id: String(index),
        legendNumber: item.legend_number,
        name: itemName(components, item.source_text),
        components,
        instruments: item.components
          .filter((component) => component.suture_id === null)
          .map((component) => component.name),
        cells: sameCells(item.cells),
      };
    }),
  };
}

/** La línea de ayuda de la mesa: lo que falta ubicar. */
export function tableHint(items: readonly EditorItem[]): string {
  if (items.length === 0) return 'Agregar el primer objeto.';
  const unplaced = items.filter((item) => item.cells.length === 0).length;
  if (unplaced === 0) return 'Todo está en su lugar.';
  return unplaced === 1 ? 'Falta ubicar 1 objeto.' : `Faltan por ubicar ${unplaced} objetos.`;
}

/** Lo que dice el lugar de un objeto: «Fila 1 · Columna 2» (la primera celda) o «Sin ubicar». */
export function placeText(item: Pick<EditorItem, 'cells'>): string {
  if (item.cells.length === 0) return 'Sin ubicar';
  const [first] = readingOrder(item.cells);
  return `Fila ${first.row} · Columna ${first.column}`;
}

/**
 * Los instrumentos más usados en las mesas con ese nombre (p. ej. «Mesa de reserva») de las técnicas
 * publicadas: de más a menos técnicas que los usan y, si empatan, por nombre.
 */
export function mostUsedInZone(
  techniques: readonly {
    items: readonly {
      zone: string | null;
      components: readonly { instrument_id: string | null }[];
    }[];
  }[],
  zoneName: string,
  instruments: readonly CatalogInstrument[],
  limit: number,
): CatalogInstrument[] {
  const uses = new Map<string, number>();
  for (const technique of techniques) {
    const ids = new Set<string>();
    for (const item of technique.items) {
      if (item.zone !== zoneName) continue;
      for (const component of item.components) {
        if (component.instrument_id !== null) ids.add(component.instrument_id);
      }
    }
    for (const id of ids) uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  return instruments
    .filter((instrument) => uses.has(instrument.id))
    .sort(
      (a, b) =>
        (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
    )
    .slice(0, limit);
}

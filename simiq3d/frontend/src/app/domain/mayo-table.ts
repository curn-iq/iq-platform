/**
 * La mesa de Mayo de una técnica y dónde va cada objeto sobre ella, en metros.
 * La regla está en `simiq3d/README.md`, «Cómo se arma la mesa en 3D»: la
 * cuadrícula de DataIQ se reparte en partes iguales sobre la mesa y cada objeto
 * va con su centro en el centro de sus celdas. Es la misma regla de SIVRI.
 *
 * Ejes de la escena: X de izquierda a derecha (las columnas), Y hacia arriba y Z
 * hacia quien mira (las filas). La fila 1 es la del fondo y la columna 1, la de
 * la izquierda, como en el diagrama de DataIQ visto desde donde se para quien
 * arma la mesa.
 */

/**
 * Tamaño de la mesa: provisional, el mismo para todas las técnicas. Orientado como en las fotos de IQ; medir la del laboratorio es para después del MVP (`docs/despues-del-mvp.md`).
 */
export const MAYO_TABLE_SIZE = { width: 0.4, depth: 0.56 } as const;

/** Una celda de la cuadrícula, contada desde 1. */
export interface TableCell {
  row: number;
  column: number;
}

/** Centro y giro de un instrumento medidos en la foto de su mesa. */
export interface ComponentPlacement extends TablePoint {
  yawDeg: number;
}

/** Uno de los componentes de un objeto: un instrumento del catálogo (o lo que la fuente nombra). */
export interface TableComponent {
  /** El instrumento del catálogo; `null` si el componente no es un instrumento (una sutura). */
  instrumentId: string | null;
  name: string;
  placement?: ComponentPlacement;
}

/**
 * Un objeto físico de la mesa: un instrumento, o varios que van juntos (el mango
 * con su hoja, o las tijeras y los mangos que IQ arma en un mismo sitio). Aunque
 * ocupe varias celdas, es uno solo y lleva un solo número en el diagrama.
 */
export interface TableItem {
  id: string;
  /** El número del diagrama de IQ; `null` si la fuente no le puso. */
  legendNumber: number | null;
  /** Lo que dice la leyenda (`itemName`). */
  name: string;
  /** Los instrumentos del catálogo que lo forman, en orden; las suturas no se dibujan. */
  instrumentIds: string[];
  /** Todos sus componentes, en orden, cada uno con su nombre. */
  components: TableComponent[];
  cells: TableCell[];
}

export interface MayoTable {
  rows: number;
  columns: number;
  items: TableItem[];
}

/** Un punto sobre la mesa, en metros desde su centro. */
export interface TablePoint {
  x: number;
  z: number;
}

/** El centro de una celda. */
export function cellCenter(
  table: Pick<MayoTable, 'rows' | 'columns'>,
  cell: TableCell,
): TablePoint {
  const width = MAYO_TABLE_SIZE.width / table.columns;
  const depth = MAYO_TABLE_SIZE.depth / table.rows;
  return {
    x: -MAYO_TABLE_SIZE.width / 2 + (cell.column - 0.5) * width,
    z: -MAYO_TABLE_SIZE.depth / 2 + (cell.row - 0.5) * depth,
  };
}

/**
 * Dónde va el centro de un objeto: el centro de sus celdas (si ocupa varias, el
 * promedio de sus centros). Sin celdas, la fuente no dice dónde va: `null`.
 */
export function itemCenter(
  table: Pick<MayoTable, 'rows' | 'columns'>,
  cells: readonly TableCell[],
): TablePoint | null {
  if (cells.length === 0) return null;
  const centers = cells.map((cell) => cellCenter(table, cell));
  return {
    x: centers.reduce((sum, point) => sum + point.x, 0) / centers.length,
    z: centers.reduce((sum, point) => sum + point.z, 0) / centers.length,
  };
}

/**
 * Cada instrumento de la mesa por separado, como lo listan la leyenda y el chat: una fila por
 * instrumento, no por objeto. Los de un mismo objeto comparten número (es el del diagrama de
 * IQ) y sitio, y quedan juntos. Un objeto de un solo componente (o sin ninguno) es una fila.
 */
export interface TablePart {
  item: TableItem;
  /** Su lugar entre los componentes del objeto. */
  index: number;
  name: string;
  /** Único en la mesa, para `track`. */
  key: string;
}

export function partsOf(items: readonly TableItem[]): TablePart[] {
  return items.flatMap((item) =>
    item.components.length > 1
      ? item.components.map((component, index) => ({
          item,
          index,
          name: component.name,
          key: `${item.id}:${index}`,
        }))
      : [{ item, index: 0, name: item.name, key: `${item.id}:0` }],
  );
}

/** Lo que se elige en la leyenda o en el chat: un objeto y cuál de sus instrumentos. */
export interface PieceChoice {
  id: string;
  part: number;
}

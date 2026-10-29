import type { TableCell } from '../../domain/table';

/** Lado de una celda en las unidades del dibujo; el SVG se escala al ancho que le den. */
export const CELL = 100;

/** Radio del círculo del número, en unidades del dibujo. */
export const NUMBER_RADIUS = 16;

/** Radio que debe medir el círculo en pantalla, a cualquier ancho de la mesa. */
const NUMBER_SCREEN_RADIUS = 11;

/** Distancia del número a la línea que une las celdas de un objeto de varias celdas. */
const NUMBER_OFFSET = 37;

/** Esquina inferior derecha de una celda: dónde va el número de un objeto de una celda. */
const CORNER = 82;

interface Point {
  x: number;
  y: number;
}

/**
 * Dónde va el círculo del número de un objeto, en unidades del dibujo. Un
 * objeto de una celda lo lleva en su esquina inferior derecha. Uno de varias lo
 * lleva junto a la línea que une su primera y su última celda (en orden de
 * lectura), a un lado de su punto medio, para no tapar lo que se dibuje sobre
 * ella.
 */
export function numberPosition(cells: readonly TableCell[]): Point {
  const [first, ...rest] = [...cells].sort((a, b) => a.row - b.row || a.column - b.column);
  const last = rest.at(-1);
  if (last === undefined) {
    return { x: (first.column - 1) * CELL + CORNER, y: (first.row - 1) * CELL + CORNER };
  }
  const center = (cell: TableCell): Point => ({
    x: (cell.column - 0.5) * CELL,
    y: (cell.row - 0.5) * CELL,
  });
  const from = center(first);
  const to = center(last);
  // Dirección de la línea (siempre hacia arriba o, si es horizontal, hacia la izquierda)
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const length = Math.hypot(dx, dy);
  return {
    x: (from.x + to.x) / 2 - (dy / length) * NUMBER_OFFSET,
    y: (from.y + to.y) / 2 + (dx / length) * NUMBER_OFFSET,
  };
}

/**
 * Cuánto agrandar o achicar el círculo del número para que mida lo mismo en
 * pantalla a cualquier ancho: `svgWidth` son los píxeles que ocupa el dibujo y
 * `viewBoxWidth`, sus unidades. Sin ancho medido todavía, no escala.
 */
export function numberScale(svgWidth: number, viewBoxWidth: number): number {
  if (svgWidth <= 0) return 1;
  return NUMBER_SCREEN_RADIUS / (NUMBER_RADIUS * (svgWidth / viewBoxWidth));
}

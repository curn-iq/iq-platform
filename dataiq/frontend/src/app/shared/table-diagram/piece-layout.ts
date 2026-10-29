import type { TableCell } from '../../domain/table';
import type { DrawingKey } from './drawings';
import type { Shape } from './shape-catalog';

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

/** Un instrumento de una celda se inclina así, como los del mockup. */
const SLANT = 40;

/** Cuánto se escala cada instrumento en su celda, para que se vea del largo que tiene en la mesa. */
const SCALE: Record<string, number> = {
  bisturi: 0.84,
  metzenbaum: 1,
  mayo: 0.88,
  diseccion: 0.9,
  farabeuf: 0.9,
  senn: 0.72,
  allis: 0.92,
  lahey: 0.95,
  rochester: 0.95,
  mosquito: 0.74,
  kelly: 0.85,
  cistica: 0.85,
  campo: 1,
  energia: 0.85,
  portaagujas: 0.8,
  frazier: 0.9,
};

/** Alto y ancho del recuadro punteado de lo que no tiene dibujo. */
const UNKNOWN_SIZE = 68;

/** Separación entre dos instrumentos que comparten un objeto. */
const SPREAD = 24;

/** Una forma ya colocada: su transformación y, si no tiene dibujo, el tamaño de su recuadro. */
export interface PlacedShape {
  kind: Shape['kind'];
  key: DrawingKey | null;
  transform: string;
  width?: number;
  height?: number;
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

/** El instrumento dibujado vertical (punta arriba, `y` de 0 a 100) se centra, gira y escala. */
function steelTransform(center: Point, angle: number, offset: number, scale: number): string {
  return (
    `translate(${round3(center.x)} ${round3(center.y)}) rotate(${round3(angle)}) ` +
    `translate(${round3(offset)} 0) scale(${round3(scale * 1.15)} ${round3(scale)}) translate(0 -50)`
  );
}

/**
 * Dónde y cómo va cada forma de un objeto. En una celda: lo plano al centro, el
 * acero inclinado encima (más chico si comparte celda con algo) y, si son dos,
 * uno a cada lado. En varias celdas: el acero a lo largo de la línea que une su
 * primera y su última celda, y lo plano en el punto medio. Lo plano y lo
 * punteado se dibujan antes que el acero, para que el acero quede encima.
 */
export function placeShapes(cells: readonly TableCell[], shapes: readonly Shape[]): PlacedShape[] {
  const sorted = [...cells].sort((a, b) => a.row - b.row || a.column - b.column);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const multi = sorted.length > 1;
  const center = (cell: TableCell): Point => ({
    x: (cell.column - 0.5) * CELL,
    y: (cell.row - 0.5) * CELL,
  });
  const from = center(first);
  const to = center(last);
  const mid: Point = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const length = Math.hypot(from.x - to.x, from.y - to.y);
  const lineAngle = multi ? (Math.atan2(from.x - to.x, -(from.y - to.y)) * 180) / Math.PI : 0;

  const origin = { x: (first.column - 1) * CELL, y: (first.row - 1) * CELL };
  const middle: Point = multi ? mid : { x: origin.x + 50, y: origin.y + 50 };

  const behind = shapes.filter((shape) => shape.kind !== 'steel');
  const steels = shapes.filter(
    (shape): shape is Extract<Shape, { key: DrawingKey }> => shape.kind === 'steel',
  );

  const placedBehind = behind.map((shape): PlacedShape => {
    if (shape.kind === 'unknown') {
      return {
        kind: 'unknown',
        key: null,
        transform: `translate(${round3(middle.x)} ${round3(middle.y)}) rotate(${round3(lineAngle)})`,
        width: UNKNOWN_SIZE,
        height: round3(UNKNOWN_SIZE + length),
      };
    }
    return {
      kind: 'flat',
      key: shape.key,
      transform: `translate(${round3(middle.x)} ${round3(middle.y)})`,
    };
  });

  const placedSteels = steels.map((shape, index): PlacedShape => {
    const offset = (index - (steels.length - 1) / 2) * SPREAD;
    let at = middle;
    let angle = lineAngle;
    let scale: number;
    if (multi) {
      scale = (length * 0.85) / CELL;
    } else {
      angle = SLANT;
      if (behind.length > 0) {
        at = { x: origin.x + 44, y: origin.y + 56 };
        scale = 0.74;
      } else if (steels.length > 1) {
        scale = 0.82;
      } else {
        at = { x: origin.x + 54, y: origin.y + 54 };
        scale = 1.2 * (SCALE[shape.key] ?? 0.9);
      }
    }
    return { kind: 'steel', key: shape.key, transform: steelTransform(at, angle, offset, scale) };
  });

  return [...placedBehind, ...placedSteels];
}

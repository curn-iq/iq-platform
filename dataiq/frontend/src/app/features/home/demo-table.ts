import { itemName } from '../../domain/item-name';
import type { Table, TableItem } from '../../domain/table';

/**
 * La mesa de Mayo de ejemplo del inicio: la portada y las ventanas de los tres
 * productos la dibujan. Es **ilustrativa y no es de ninguna técnica del
 * catálogo** (decidido por Juan el 2026-10-31): la API solo entrega las mesas con
 * cuenta (Resuelto 27 de `dataiq/docs/checklist-frontend.md`), así que un
 * visitante no las puede pedir. Por eso todo lo que la muestra lleva
 * «demostración». Las posiciones son un ejemplo para ilustrar, no el arreglo de
 * IQ; los nombres son los del catálogo, para que cada pieza tome su dibujo
 * (`shape-catalog.ts`).
 */
interface DemoPiece {
  number: number;
  row: number;
  column: number;
  /** Los componentes del objeto, como en el catálogo. */
  components: string[];
  /** El nombre corto de la etiqueta de detección de la cámara. */
  short: string;
  /** La confianza de ejemplo de SIVRI (valores de demostración). */
  confidence: string;
}

const PIECES: readonly DemoPiece[] = [
  {
    number: 1,
    row: 7,
    column: 3,
    components: ['Mango de bisturí N.° 3', 'Hoja de bisturí #15'],
    short: 'Bisturí N.° 3',
    confidence: '0,97',
  },
  {
    number: 2,
    row: 6,
    column: 3,
    components: ['Tijera de Metzenbaum'],
    short: 'Metzenbaum',
    confidence: '0,95',
  },
  {
    number: 3,
    row: 5,
    column: 3,
    components: ['Tijera de Mayo'],
    short: 'Tijera de Mayo',
    confidence: '0,96',
  },
  {
    number: 4,
    row: 4,
    column: 7,
    components: ['Pinza de disección'],
    short: 'Disección',
    confidence: '0,93',
  },
  {
    number: 5,
    row: 4,
    column: 6,
    components: ['Separador de Farabeuf'],
    short: 'Farabeuf',
    confidence: '0,98',
  },
  {
    number: 6,
    row: 4,
    column: 4,
    components: ['Separador de Senn Miller'],
    short: 'Senn Miller',
    confidence: '0,91',
  },
  {
    number: 7,
    row: 1,
    column: 5,
    components: ['Pinza de Allis'],
    short: 'Allis',
    confidence: '0,97',
  },
  { number: 8, row: 1, column: 2, components: ['Pinza Lahey'], short: 'Lahey', confidence: '0,94' },
  {
    number: 9,
    row: 2,
    column: 1,
    components: ['Pinza Rochester'],
    short: 'Rochester',
    confidence: '0,96',
  },
  {
    number: 10,
    row: 3,
    column: 1,
    components: ['Pinza mosquito curva'],
    short: 'Mosquito',
    confidence: '0,92',
  },
];

/** La mesa de ejemplo es de 7 × 7 celdas. */
export const DEMO_SIZE = 7;

function toItem(piece: DemoPiece): TableItem {
  return {
    id: `demo-${piece.number}`,
    legendNumber: piece.number,
    name: itemName(piece.components, ''),
    components: piece.components,
    instruments: piece.components,
    cells: [{ row: piece.row, column: piece.column }],
  };
}

export const DEMO_TABLE: Table = {
  zoneId: 'demo',
  name: 'Mesa de Mayo de ejemplo',
  rows: DEMO_SIZE,
  columns: DEMO_SIZE,
  items: PIECES.map(toItem),
};

/** La pieza de la demostración de SIVRI que quedó una celda a la derecha de su lugar. */
export const MISPLACED_NUMBER = 6;

/** El nombre corto y la confianza de ejemplo de cada número, para las etiquetas de la cámara. */
export const DEMO_DETECTIONS: ReadonlyMap<number, { short: string; confidence: string }> = new Map(
  PIECES.map((piece) => [piece.number, { short: piece.short, confidence: piece.confidence }]),
);

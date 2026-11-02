import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EditorCell } from '../../../../domain/editor-content';
import { readingOrder } from '../../../../domain/table';
import type { TableChange } from '../../../../domain/version-diff';

/** Lado de la comparación: la mesa publicada marca de dónde salió cada pieza; la propuesta, adónde llegó. */
export type MarksSide = 'published' | 'proposed';

/** Una forma de la capa: un recuadro de celda o el trayecto de una pieza. */
interface Mark {
  key: string;
  kind: 'origin' | 'destination' | 'path';
  /** El número del objeto: la marca se enciende cuando es el señalado. */
  number: number | null;
  /** Recuadro de una celda, en unidades del dibujo. */
  x?: number;
  y?: number;
  /** El trayecto con su punta. */
  d?: string;
  /** Largo del trayecto, para trazarlo al señalar. */
  length?: number;
}

/** Cada celda mide 100 unidades, como en el diagrama de mesa. */
const CELL = 100;
/** El recuadro deja 6 unidades de margen en cada lado de la celda. */
const INSET = 6;
const SIZE = CELL - 2 * INSET;

function center(cell: EditorCell): { x: number; y: number } {
  return { x: (cell.column - 0.5) * CELL, y: (cell.row - 0.5) * CELL };
}

function firstCell(cells: readonly EditorCell[]): EditorCell | undefined {
  return readingOrder(cells)[0];
}

/** El trayecto de `from` a `to`, con una punta de flecha en `to`, y su largo. */
function pathBetween(from: EditorCell, to: EditorCell): { d: string; length: number } {
  const start = center(from);
  const end = center(to);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = (turn: number) =>
    `${(end.x - 14 * Math.cos(angle + turn)).toFixed(1)} ${(end.y - 14 * Math.sin(angle + turn)).toFixed(1)}`;
  return {
    d: `M${start.x} ${start.y} L${end.x} ${end.y} M${head(0.5)} L${end.x} ${end.y} L${head(-0.5)}`,
    length: Math.hypot(end.x - start.x, end.y - start.y) + 20,
  };
}

/**
 * Las marcas de la comparación de mesas, dibujadas encima del diagrama con su misma cuadrícula (100
 * unidades por celda) y sin atrapar el puntero. En la publicada, un contorno punteado en la celda de
 * la que salió cada pieza movida, modificada o quitada; en la propuesta, un anillo `marca` donde
 * está ahora la pieza movida, modificada o agregada, el fantasma punteado de su origen y un
 * trayecto con punta, que reposa tenue y se traza al señalar el cambio. Ver «Versiones por
 * revisar (página)» en `DESIGN.md`.
 */
@Component({
  selector: 'app-table-marks',
  templateUrl: './table-marks.html',
  styleUrl: './table-marks.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableMarks {
  readonly side = input.required<MarksSide>();
  readonly columns = input.required<number>();
  readonly rows = input.required<number>();
  readonly changes = input.required<readonly TableChange[]>();
  /** El número señalado, o `null`. */
  readonly active = input<number | null>(null);

  protected readonly width = computed(() => this.columns() * CELL);
  protected readonly height = computed(() => this.rows() * CELL);
  protected readonly size = SIZE;

  protected readonly marks = computed<Mark[]>(() =>
    this.changes().flatMap((change): Mark[] => {
      const origin = change.fromCells.map((cell, index): Mark => ({
        key: `${change.key}-origin-${index}`,
        kind: 'origin',
        number: change.number,
        x: (cell.column - 1) * CELL + INSET,
        y: (cell.row - 1) * CELL + INSET,
      }));
      if (this.side() === 'published') return origin;
      const destination = change.toCells.map((cell, index): Mark => ({
        key: `${change.key}-destination-${index}`,
        kind: 'destination',
        number: change.number,
        x: (cell.column - 1) * CELL + INSET,
        y: (cell.row - 1) * CELL + INSET,
      }));
      const from = firstCell(change.fromCells);
      const to = firstCell(change.toCells);
      const moved = change.kind === 'moved' || change.kind === 'modified';
      const path =
        moved && from && to && (from.row !== to.row || from.column !== to.column)
          ? [
              {
                key: `${change.key}-path`,
                kind: 'path' as const,
                number: change.number,
                ...pathBetween(from, to),
              },
            ]
          : [];
      return [...(path.length > 0 ? origin : []), ...destination, ...path];
    }),
  );

  protected isActive(mark: Mark): boolean {
    return mark.number !== null && mark.number === this.active();
  }
}

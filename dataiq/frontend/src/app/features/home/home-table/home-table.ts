import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import type { Table } from '../../../domain/table';
import { MOBILE_QUERY, mediaQuery } from '../../../shared/media-query';
import { DrawingParts } from '../../../shared/table-diagram/drawing-parts';
import { DRAWINGS, type Part } from '../../../shared/table-diagram/drawings';
import { CELL, placeShapes } from '../../../shared/table-diagram/piece-layout';
import { shapesFor } from '../../../shared/table-diagram/shape-catalog';
import { SteelGradients } from '../../../shared/table-diagram/steel-gradients';
import { detectionLabel, labelSize, placeLabels, textWidth, type Box } from '../detections';
import { DEMO_DETECTIONS, DEMO_TABLE, MISPLACED_NUMBER } from '../demo-table';

/** Las tres vistas de la misma mesa: referencia (DataIQ), 3D (SIMIQ3D) y cámara (SIVRI). */
export type TableView = 'reference' | '3d' | 'camera';

/** El rótulo del destino de la pieza fuera de lugar. */
export const WHERE_TEXT = 'Va aquí';

/** Cuánto se corre la pieza fuera de lugar en la cámara: una celda a la derecha. */
const MISPLACED_SHIFT = CELL;

/** El tamaño de la letra de las etiquetas dentro del dibujo; en celular el dibujo se ve más chico. */
const LABEL_FONT = 14;
const LABEL_FONT_MOBILE = 26;

/** El número va en la esquina de arriba a la izquierda de la celda, como en `inicio.html`. */
const NUMBER_OFFSET = 19;

/** Relleno de la caja de detección alrededor de la pieza dibujada. */
const BOX_PADDING = 5;

/** Relleno de la caja de una pieza sin medir (sin `getBBox`): la celda menos un margen. */
const FALLBACK_INSET = 14;

interface DrawnShape {
  transform: string;
  key: string | null;
  parts: readonly Part[];
}

interface Piece {
  number: number;
  label: string;
  shapes: DrawnShape[];
  hit: { x: number; y: number };
  numberAt: { x: number; y: number };
}

/** Una detección de la cámara ya calculada: su caja, su etiqueta y, si está fuera de lugar, su destino. */
interface Detection {
  number: number;
  error: boolean;
  box: Box;
  perimeter: number;
  label: Box;
  text: string;
  textX: number;
  textY: number;
  target: { box: Box; labelX: number; labelY: number } | null;
}

/** Para que cada mesa tenga sus propios degradados: varias en una página no comparten `id`. */
let nextGradient = 0;

/**
 * La mesa de Mayo de ejemplo del inicio (`DEMO_TABLE`): la portada y las
 * ventanas de los tres productos la dibujan, con las piezas de acero del
 * diagrama de mesa sobre la grilla. Según «Escenario de la mesa» de `DESIGN.md`
 * es el objeto firma: el paño verde lo pone quien la usa; aquí van las piezas,
 * su número, la rejilla y las detecciones de la cámara.
 *
 * - `interactive`: cada pieza se señala con el puntero o el teclado y se elige
 *   con un clic; `selected` es la elegida, que se queda aunque el puntero se vaya.
 * - `view`: en 3D las piezas y los números se agrandan; en la cámara se ocultan
 *   los números y la rejilla.
 * - `detectable`: dibuja la capa de la cámara (cajas, etiquetas y «Va aquí»);
 *   `detecting` la muestra y `scanned` traza las cajas una a una.
 * - `displaced`: la pieza fuera de lugar de la demostración, una celda a la derecha.
 */
@Component({
  selector: 'app-home-table',
  imports: [DrawingParts, SteelGradients],
  templateUrl: './home-table.html',
  styleUrl: './home-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-view]': 'view()' },
})
export class HomeTable {
  readonly table = input<Table>(DEMO_TABLE);
  readonly view = input<TableView>('reference');
  readonly grid = input(false);
  readonly numbers = input(false);
  readonly interactive = input(false);
  readonly detectable = input(false);
  readonly detecting = input(false);
  readonly scanned = input(true);
  readonly displaced = input(false);
  /** El número elegido, o `null` si no hay ninguno. */
  readonly selected = model<number | null>(null);
  /** Se eligió una pieza con un clic o con Enter o Espacio (no basta con pasar el puntero). */
  readonly activated = output<number>();

  private readonly gradient = nextGradient++;
  protected readonly steelId = `home-steel-${this.gradient}`;
  protected readonly bladeId = `home-blade-${this.gradient}`;

  protected readonly cell = CELL;
  protected readonly size = computed(() => this.table().columns * CELL);
  protected readonly gridLines = computed(() =>
    Array.from({ length: Math.max(this.table().columns - 1, 0) }, (_, index) => (index + 1) * CELL),
  );

  protected readonly pieces = computed<Piece[]>(() =>
    this.table().items.flatMap((item) => {
      if (item.cells.length === 0 || item.legendNumber === null) return [];
      const shapes = placeShapes(item.cells, shapesFor(item.instruments))
        .filter((shape) => shape.kind !== 'unknown')
        .map((shape) => ({
          transform: shape.transform,
          key: shape.key,
          parts: shape.key === null ? [] : DRAWINGS[shape.key].parts,
        }));
      const first = item.cells[0];
      return [
        {
          number: item.legendNumber,
          label: `${item.legendNumber}: ${item.name}`,
          shapes,
          hit: { x: (first.column - 1) * CELL, y: (first.row - 1) * CELL },
          numberAt: {
            x: first.column * CELL - CELL + NUMBER_OFFSET,
            y: first.row * CELL - CELL + NUMBER_OFFSET,
          },
        },
      ];
    }),
  );

  // ---------- Capa de la cámara ----------

  private readonly narrow = mediaQuery(MOBILE_QUERY);
  protected readonly fontSize = computed(() => (this.narrow() ? LABEL_FONT_MOBILE : LABEL_FONT));

  private readonly shapeRefs = viewChildren<ElementRef<SVGGElement>>('shape');
  /** La caja de cada pieza tal como se dibuja, medida en el navegador; vacía mientras no se mide. */
  private readonly measured = signal<(Box | null)[]>([]);

  protected readonly detections = computed<Detection[]>(() => {
    if (!this.detectable()) return [];
    const pieces = this.pieces();
    const measured = this.measured();
    const font = this.fontSize();
    const boxes = pieces.map((piece, index) => this.boxOf(piece, measured[index] ?? null));
    const targets = pieces.map((piece, index) =>
      piece.number === MISPLACED_NUMBER && this.displaced()
        ? { ...boxes[index], x: boxes[index].x - MISPLACED_SHIFT }
        : null,
    );
    const texts = pieces.map((piece) => {
      const known = DEMO_DETECTIONS.get(piece.number);
      return known ? detectionLabel(known.short, known.confidence, this.narrow()) : '';
    });
    const targetLabels = targets.map((target) => {
      if (target === null) return null;
      const y = target.y + target.height + 16;
      return {
        x: target.x,
        y,
        // Lo que ocupa el rótulo «Va aquí», para que ninguna etiqueta lo tape
        box: {
          x: target.x - 4,
          y: y - font / 2 - 4,
          width: textWidth(WHERE_TEXT, font) + 8,
          height: font + 8,
        },
      };
    });
    const labels = placeLabels(
      boxes,
      texts.map((text) => labelSize(text, font)),
      targetLabels.flatMap((label) => (label === null ? [] : [label.box])),
    );
    return pieces.map((piece, index) => {
      const box = boxes[index];
      const target = targets[index];
      const label = labels[index];
      return {
        number: piece.number,
        error: target !== null,
        box,
        perimeter: Math.round(2 * (box.width + box.height)),
        label,
        text: texts[index],
        textX: label.x + font * 0.55,
        textY: label.y + label.height / 2,
        target:
          target === null
            ? null
            : { box: target, labelX: targetLabels[index]!.x, labelY: targetLabels[index]!.y },
      };
    });
  });

  constructor() {
    afterNextRender(() => this.measure());
  }

  /** La caja de una pieza: la medida con un relleno y, si la pieza está corrida, corrida con ella. */
  private boxOf(piece: Piece, bbox: Box | null): Box {
    const shift = this.displaced() && piece.number === MISPLACED_NUMBER ? MISPLACED_SHIFT : 0;
    if (bbox === null) {
      return {
        x: piece.hit.x + FALLBACK_INSET + shift,
        y: piece.hit.y + FALLBACK_INSET,
        width: CELL - 2 * FALLBACK_INSET,
        height: CELL - 2 * FALLBACK_INSET,
      };
    }
    return {
      x: bbox.x - BOX_PADDING + shift,
      y: bbox.y - BOX_PADDING,
      width: bbox.width + 2 * BOX_PADDING,
      height: bbox.height + 2 * BOX_PADDING,
    };
  }

  /** Mide lo que ocupa cada pieza dibujada. Sin `getBBox` (jsdom) o sin tamaño, se usa la celda. */
  private measure(): void {
    if (!this.detectable()) return;
    this.measured.set(
      this.shapeRefs().map(({ nativeElement }) => {
        try {
          const { x, y, width, height } = nativeElement.getBBox();
          return width > 0 && height > 0 ? { x, y, width, height } : null;
        } catch {
          return null;
        }
      }),
    );
  }

  /** El puntero o el foco llegan a una pieza: se elige. */
  protected pick(number: number): void {
    if (this.interactive()) this.selected.set(number);
  }

  /** Un clic, Enter o Espacio en una pieza. La mesa decorativa no reacciona a nada. */
  protected activate(number: number): void {
    if (!this.interactive()) return;
    this.selected.set(number);
    this.activated.emit(number);
  }

  protected isDisplaced(number: number): boolean {
    return this.displaced() && number === MISPLACED_NUMBER;
  }
}

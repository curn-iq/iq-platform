import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { Table } from '../../domain/table';
import { CELL, NUMBER_RADIUS, numberPosition, numberScale } from './piece-layout';

/** Un objeto listo para dibujar: sus celdas y su número, ya en unidades del dibujo. */
interface Piece {
  id: string;
  legendNumber: number | null;
  hits: { x: number; y: number }[];
  number: { x: number; y: number } | null;
}

/**
 * El diagrama de mesa, según «Detalle de técnica» de `DESIGN.md`: un diagrama
 * sereno en `superficie` con filete y una rejilla fina, sin paño. Dibuja la
 * grilla del tamaño de la mesa (`rows` × `columns`) y sus objetos; el ancho lo
 * decide quien lo use. Un objeto en varias celdas es una sola pieza, con una
 * zona de clic por celda y un solo número.
 */
@Component({
  selector: 'app-table-diagram',
  templateUrl: './table-diagram.html',
  styleUrl: './table-diagram.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--aspect]': 'aspect()' },
})
export class TableDiagram {
  readonly table = input.required<Table>();

  protected readonly cell = CELL;
  protected readonly numberRadius = NUMBER_RADIUS;
  protected readonly aspect = computed(() => `${this.table().columns} / ${this.table().rows}`);
  protected readonly width = computed(() => this.table().columns * CELL);
  protected readonly height = computed(() => this.table().rows * CELL);

  /** Posiciones de las líneas entre columnas y entre filas: solo las de adentro, no el borde. */
  protected readonly columnLines = computed(() => interior(this.table().columns));
  protected readonly rowLines = computed(() => interior(this.table().rows));

  /** Los objetos que la fuente ubica; los que no tienen celda no se dibujan. */
  protected readonly pieces = computed<Piece[]>(() =>
    this.table().items.flatMap((item) =>
      item.cells.length === 0
        ? []
        : [
            {
              id: item.id,
              legendNumber: item.legendNumber,
              hits: item.cells.map((cell) => ({
                x: (cell.column - 1) * CELL,
                y: (cell.row - 1) * CELL,
              })),
              number: item.legendNumber === null ? null : numberPosition(item.cells),
            },
          ],
    ),
  );

  /** Los números miden lo mismo en pantalla a cualquier ancho de la mesa. */
  protected readonly numberScale = signal(1);

  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const element = this.svg().nativeElement;
      const observer = new ResizeObserver(() =>
        this.numberScale.set(numberScale(element.getBoundingClientRect().width, this.width())),
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

function interior(count: number): number[] {
  return Array.from({ length: Math.max(count - 1, 0) }, (_, index) => (index + 1) * CELL);
}

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import type { Table } from '../../domain/table';
import { DRAWINGS, type Part } from './drawings';
import {
  CELL,
  NUMBER_RADIUS,
  numberPosition,
  numberScale,
  placeShapes,
  type PlacedShape,
} from './piece-layout';
import { shapesFor } from './shape-catalog';

/** Una forma ya colocada, con las partes de su dibujo (el recuadro punteado no tiene). */
interface DrawnShape extends PlacedShape {
  parts: Part[];
}

/** Un objeto listo para dibujar: sus formas, sus celdas y su número, en unidades del dibujo. */
interface Piece {
  id: string;
  legendNumber: number | null;
  label: string;
  /** Solo tela, bandeja o recuadro punteado: al atenuarse queda menos transparente que el acero. */
  flat: boolean;
  shapes: DrawnShape[];
  hits: { x: number; y: number }[];
  number: { x: number; y: number } | null;
}

/** Para que cada diagrama tenga sus propios degradados: dos diagramas en una página no comparten `id`. */
let nextGradient = 0;

/**
 * El diagrama de mesa, según «Detalle de técnica» de `DESIGN.md`: un diagrama
 * sereno en `superficie` con filete y una rejilla fina, sin paño. Dibuja la
 * grilla del tamaño de la mesa (`rows` × `columns`) y sus objetos: el
 * instrumental en acero, lo de tela o bandeja plano y lo que no tiene dibujo en
 * un recuadro punteado. Un objeto en varias celdas es una sola pieza, con una
 * zona de clic por celda y un solo número.
 *
 * `highlighted` es el número señalado: con `[(highlighted)]` se enlaza con
 * `app-table-legend`. La pieza señalada se levanta y las demás se atenúan; pasar
 * el puntero o enfocar una pieza la señala. El ancho lo decide quien lo use.
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
  /** El número señalado, o `null` si no hay ninguno. */
  readonly highlighted = model<number | null>(null);

  protected readonly cell = CELL;
  protected readonly numberRadius = NUMBER_RADIUS;
  protected readonly aspect = computed(() => `${this.table().columns} / ${this.table().rows}`);
  protected readonly width = computed(() => this.table().columns * CELL);
  protected readonly height = computed(() => this.table().rows * CELL);

  private readonly gradient = nextGradient++;
  protected readonly steelId = `steel-${this.gradient}`;
  protected readonly bladeId = `blade-${this.gradient}`;

  /** Posiciones de las líneas entre columnas y entre filas: solo las de adentro, no el borde. */
  protected readonly columnLines = computed(() => interior(this.table().columns));
  protected readonly rowLines = computed(() => interior(this.table().rows));

  /** Los objetos que la fuente ubica; los que no tienen celda no se dibujan. */
  protected readonly pieces = computed<Piece[]>(() =>
    this.table().items.flatMap((item) => {
      if (item.cells.length === 0) return [];
      const shapes = placeShapes(item.cells, shapesFor(item.components)).map((shape) => ({
        ...shape,
        parts: shape.key === null ? [] : DRAWINGS[shape.key].parts,
      }));
      return [
        {
          id: item.id,
          legendNumber: item.legendNumber,
          label: item.legendNumber === null ? '' : `${item.legendNumber}: ${item.name}`,
          flat: shapes.every((shape) => shape.kind !== 'steel'),
          shapes,
          hits: item.cells.map((cell) => ({
            x: (cell.column - 1) * CELL,
            y: (cell.row - 1) * CELL,
          })),
          number: item.legendNumber === null ? null : numberPosition(item.cells),
        },
      ];
    }),
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

  /** El puntero o el foco llegan a una pieza: se señala su número. Una pieza sin número no se señala. */
  protected point(number: number | null): void {
    if (number !== null) this.highlighted.set(number);
  }

  /** Se va el puntero o el foco: se suelta, salvo que ya se haya señalado otra pieza. */
  protected release(number: number | null): void {
    if (number !== null && this.highlighted() === number) this.highlighted.set(null);
  }
}

function interior(count: number): number[] {
  return Array.from({ length: Math.max(count - 1, 0) }, (_, index) => (index + 1) * CELL);
}

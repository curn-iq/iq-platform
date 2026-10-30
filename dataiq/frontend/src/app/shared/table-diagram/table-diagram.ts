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

/** `full` es la mesa entera, con números y leyenda; `preview`, el vistazo recortado de la puerta de cuenta. */
export type TableDiagramVariant = 'full' | 'preview';

/** Cuántas filas se ven en la vista previa: «dos filas y media» (ver «Puerta de cuenta» en `DESIGN.md`). */
const PREVIEW_ROWS = 2.5;

/** Un objeto listo para dibujar: sus formas, sus celdas y su número, en unidades del dibujo. */
interface Piece {
  id: string;
  legendNumber: number | null;
  /** Se puede señalar y llegar con el teclado: tiene número y la variante es la completa. */
  linked: boolean;
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
 * La variante `preview` es el vistazo de la puerta de cuenta: la misma mesa
 * recortada a sus primeras filas y difuminada hacia abajo, sin números, sin
 * enlace con la leyenda y oculta a los lectores de pantalla. Con celdas de 104 px
 * en toda mesa, mide según sus columnas. Una mesa sin objetos se dibuja igual: así
 * un visitante no sabe si la técnica la tiene.
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
  host: {
    '[attr.data-variant]': 'variant()',
    '[attr.data-cropped]': 'preview() ? cropped() : null',
    '[style.--aspect]': 'aspect()',
    '[style.--columns]': 'preview() ? table().columns : null',
    '[style.--visible-rows]': 'preview() ? visibleRows() : null',
  },
})
export class TableDiagram {
  readonly table = input.required<Table>();
  readonly variant = input<TableDiagramVariant>('full');
  /** El número señalado, o `null` si no hay ninguno. */
  readonly highlighted = model<number | null>(null);

  protected readonly preview = computed(() => this.variant() === 'preview');
  protected readonly visibleRows = computed(() => Math.min(this.table().rows, PREVIEW_ROWS));
  /** La mesa es más alta que lo que muestra la vista previa: se recorta y se difumina. */
  protected readonly cropped = computed(() => this.table().rows > PREVIEW_ROWS);

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
      const linked = !this.preview() && item.legendNumber !== null;
      const shapes = placeShapes(item.cells, shapesFor(item.instruments)).map((shape) => ({
        ...shape,
        parts: shape.key === null ? [] : DRAWINGS[shape.key].parts,
      }));
      return [
        {
          id: item.id,
          legendNumber: item.legendNumber,
          linked,
          label: `${item.legendNumber}: ${item.name}`,
          flat: shapes.every((shape) => shape.kind !== 'steel'),
          shapes,
          hits: item.cells.map((cell) => ({
            x: (cell.column - 1) * CELL,
            y: (cell.row - 1) * CELL,
          })),
          number: linked ? numberPosition(item.cells) : null,
        },
      ];
    }),
  );

  /** Los píxeles que ocupa el dibujo en pantalla; 0 mientras no se ha medido. */
  private readonly svgWidth = signal(0);

  /**
   * Los números miden lo mismo en pantalla a cualquier ancho de la mesa. Depende
   * del ancho en pantalla y del de la mesa en celdas: otra mesa en el mismo
   * espacio también cambia la escala.
   */
  protected readonly numberScale = computed(() => numberScale(this.svgWidth(), this.width()));

  /** El número de la pieza que tiene el foco: sigue señalada aunque el puntero pase y se vaya. */
  private focused: number | null = null;

  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const element = this.svg().nativeElement;
      const observer = new ResizeObserver(() =>
        this.svgWidth.set(element.getBoundingClientRect().width),
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** El puntero llega a una pieza: se señala su número. Una pieza sin número no se señala. */
  protected enter(number: number | null): void {
    if (number !== null && !this.preview()) this.highlighted.set(number);
  }

  /** Se va el puntero: se vuelve a la pieza con el foco, salvo que ya se haya señalado otra. */
  protected leave(number: number | null): void {
    if (number !== null && this.highlighted() === number) this.highlighted.set(this.focused);
  }

  protected focus(number: number | null): void {
    this.focused = number;
    this.enter(number);
  }

  /** Se va el foco: se suelta, salvo que ya se haya señalado otra pieza. */
  protected blur(number: number | null): void {
    this.focused = null;
    if (number !== null && this.highlighted() === number) this.highlighted.set(null);
  }
}

function interior(count: number): number[] {
  return Array.from({ length: Math.max(count - 1, 0) }, (_, index) => (index + 1) * CELL);
}

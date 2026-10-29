import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Table } from '../../domain/table';

/** Lado de una celda en las unidades del dibujo; el SVG se escala al ancho que le den. */
const CELL = 100;

/**
 * El diagrama de mesa, según «Detalle de técnica» de `DESIGN.md`: un diagrama
 * sereno en `superficie` con filete y una rejilla fina, sin paño. Dibuja la
 * grilla del tamaño de la mesa (`rows` × `columns`) y toma su proporción; el
 * ancho lo decide quien lo use.
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
  protected readonly aspect = computed(() => `${this.table().columns} / ${this.table().rows}`);
  protected readonly width = computed(() => this.table().columns * CELL);
  protected readonly height = computed(() => this.table().rows * CELL);

  /** Posiciones de las líneas entre columnas y entre filas: solo las de adentro, no el borde. */
  protected readonly columnLines = computed(() => interior(this.table().columns));
  protected readonly rowLines = computed(() => interior(this.table().rows));
}

function interior(count: number): number[] {
  return Array.from({ length: Math.max(count - 1, 0) }, (_, index) => (index + 1) * CELL);
}

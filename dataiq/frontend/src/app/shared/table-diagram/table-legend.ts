import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { Table } from '../../domain/table';

/**
 * La leyenda numerada de una mesa, según «Detalle de técnica» de `DESIGN.md`:
 * cada objeto con su número y su nombre, enlazada con `app-table-diagram`. Se
 * enlazan con `[(highlighted)]`: señalar un número (con el puntero o el
 * teclado) marca su fila aquí y levanta su pieza en la mesa, y al revés.
 * Solo lista lo que está en la mesa: un objeto con número y celdas.
 */
@Component({
  selector: 'app-table-legend',
  templateUrl: './table-legend.html',
  styleUrl: './table-legend.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableLegend {
  readonly table = input.required<Table>();
  /** El número señalado, o `null` si no hay ninguno. */
  readonly highlighted = model<number | null>(null);

  protected readonly rows = computed(() =>
    this.table()
      .items.flatMap((item) =>
        item.legendNumber === null || item.cells.length === 0
          ? []
          : [{ id: item.id, number: item.legendNumber, name: item.name }],
      )
      .sort((a, b) => a.number - b.number),
  );

  protected point(number: number): void {
    this.highlighted.set(number);
  }

  /** Se va el puntero o el foco: se suelta, salvo que ya se haya señalado otra fila. */
  protected release(number: number): void {
    if (this.highlighted() === number) this.highlighted.set(null);
  }
}

import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { legendEntries } from '../../domain/legend';
import type { Table } from '../../domain/table';

/**
 * La leyenda numerada de una mesa, según «Detalle de técnica» de `DESIGN.md`:
 * cada objeto con su número y su nombre, enlazada con `app-table-diagram`. Se
 * enlazan con `[(highlighted)]`: señalar un número (con el puntero o el
 * teclado) marca su fila aquí y levanta su pieza en la mesa, y al revés.
 *
 * Solo las filas de objetos que están en la mesa se señalan. Un objeto que la
 * fuente no ubica se lista apagado y sin enlace, y un número que no deja leer
 * queda como hueco «Sin dato» (ver `domain/legend.ts`).
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

  protected readonly rows = computed(() => legendEntries(this.table().items));

  /** El número de la fila que tiene el foco: sigue señalada aunque el puntero pase y se vaya. */
  private focused: number | null = null;

  protected enter(number: number): void {
    this.highlighted.set(number);
  }

  /** Se va el puntero: se vuelve a la fila con el foco, salvo que ya se haya señalado otra. */
  protected leave(number: number): void {
    if (this.highlighted() === number) this.highlighted.set(this.focused);
  }

  protected focus(number: number): void {
    this.focused = number;
    this.highlighted.set(number);
  }

  /** Se va el foco: se suelta, salvo que ya se haya señalado otra fila. */
  protected blur(number: number): void {
    this.focused = null;
    if (this.highlighted() === number) this.highlighted.set(null);
  }
}

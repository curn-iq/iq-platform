import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import type { Table } from '../../../domain/table';
import { TableDiagram } from '../../../shared/table-diagram/table-diagram';
import { TableLegend } from '../../../shared/table-diagram/table-legend';

/**
 * La hoja de una mesa del detalle (Mesa de Mayo o Mesa de reserva): su título, la
 * indicación, la leyenda y el diagrama. Si la técnica no lleva esa mesa, el recuadro
 * dice que no la hay.
 *
 * Esta hoja tiene la mesa y su leyenda, así que guarda el número señalado
 * (`highlighted`) y el de lo que tiene el foco (`focused`) y se los pasa a los dos. Si
 * cada uno recordara solo su foco, una pieza enfocada se soltaría al pasar el puntero
 * por la leyenda y irse (y al revés): con un foco único, el puntero vuelve a la
 * enfocada. Cada mesa tiene su propia numeración, así que cada hoja tiene los suyos, y
 * cambiar de técnica los borra.
 */
@Component({
  selector: 'app-technique-table',
  imports: [TableDiagram, TableLegend],
  templateUrl: './technique-table.html',
  styleUrl: './technique-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--aspect]': 'aspect()' },
})
export class TechniqueTable {
  /** «Mesa de Mayo» o «Mesa de reserva». */
  readonly title = input.required<string>();
  /** Lo que dice bajo el título: cómo usar la leyenda. */
  readonly hint = input.required<string>();
  /** Lo que dice el recuadro cuando la técnica no lleva esta mesa. */
  readonly empty = input.required<string>();
  /** La mesa, o `undefined` si la técnica no la lleva. */
  readonly table = input<Table>();

  protected readonly highlighted = linkedSignal<Table | undefined, number | null>({
    source: this.table,
    computation: () => null,
  });
  protected readonly focused = linkedSignal<Table | undefined, number | null>({
    source: this.table,
    computation: () => null,
  });

  /** La proporción de la mesa, para que ocupe lo que le toca según sus columnas y filas. */
  protected readonly aspect = computed(() => {
    const table = this.table();
    return table ? table.columns / table.rows : 1;
  });
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Table, TableItem } from '../../domain/table';

interface MiniCell {
  /** Es una celda del objeto. */
  on: boolean;
  /** Lleva el número: la primera celda del objeto, en orden de lectura. */
  numbered: boolean;
}

/**
 * La mesa en miniatura del catálogo de instrumental («Dónde va», ver «Catálogo
 * de instrumental» en `DESIGN.md`): una rejilla de celdas de 22 px (18 px en
 * celular) con las celdas de **un** objeto encendidas en `marca`, y la primera
 * como círculo con su número. Todas las mesas van a la misma escala, así que una
 * mesa ancha se desplaza dentro de su marco, con el borde desvanecido.
 *
 * Es decorativa: quien la use pone al lado el nombre de la técnica y de la mesa
 * y el número, en texto. `index` es el turno de la fila en la lista: las celdas
 * se encienden una tras otra al abrir la entrada.
 */
@Component({
  selector: 'app-table-miniature',
  templateUrl: './table-miniature.html',
  styleUrl: './table-miniature.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableMiniature {
  readonly table = input.required<Table>();
  /** El objeto cuyas celdas se encienden. */
  readonly item = input.required<TableItem>();
  /** El turno de esta miniatura entre las de la lista, para escalonar cuándo se enciende. */
  readonly index = input(0);

  protected readonly cells = computed<MiniCell[]>(() => {
    const { rows, columns } = this.table();
    const { cells, legendNumber } = this.item();
    const first = [...cells].sort((a, b) => a.row - b.row || a.column - b.column)[0];
    const taken = new Set(cells.map((cell) => `${cell.row},${cell.column}`));
    return Array.from({ length: rows * columns }, (_, position) => {
      const row = Math.floor(position / columns) + 1;
      const column = (position % columns) + 1;
      return {
        on: taken.has(`${row},${column}`),
        numbered: legendNumber !== null && first?.row === row && first.column === column,
      };
    });
  });
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DEMO_TABLE } from '../demo-table';
import { HomeTable } from '../home-table/home-table';

/**
 * La ventana de SIVRI del carril: la cámara sobre la mesa de ejemplo, con las
 * cajas de detección, una pieza fuera de lugar y los conteos al pie. Es una
 * maqueta (lo dice «demostración»). Decorativa para los lectores de pantalla: el
 * texto del producto está a su lado.
 */
@Component({
  selector: 'app-sivri-window',
  imports: [HomeTable],
  templateUrl: './sivri-window.html',
  styleUrl: './sivri-window.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class SivriWindow {
  protected readonly tableName = DEMO_TABLE.name;
  protected readonly inPlace = DEMO_TABLE.items.length - 1;
}

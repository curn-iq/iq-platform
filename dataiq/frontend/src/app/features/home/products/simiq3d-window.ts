import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DEMO_TABLE } from '../demo-table';
import { HomeTable } from '../home-table/home-table';

/**
 * La ventana de SIMIQ3D del carril: una conversación con el chat y, a la derecha,
 * la mesa de ejemplo girando en 3D con la ficha de una pieza. Es una maqueta (lo
 * dice «demostración»); las técnicas de las sugerencias son del catálogo, pero lo
 * que muestra la ventana no es de ninguna de ellas. Decorativa para los lectores
 * de pantalla: el texto del producto está a su lado.
 */
@Component({
  selector: 'app-simiq3d-window',
  imports: [HomeTable],
  templateUrl: './simiq3d-window.html',
  styleUrl: './simiq3d-window.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class Simiq3dWindow {
  protected readonly tableName = DEMO_TABLE.name;
}

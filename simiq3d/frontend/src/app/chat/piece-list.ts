import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TableItem } from '../domain/mayo-table';

/**
 * La respuesta de «Instrumental» como lista: el número del diagrama de IQ y el
 * nombre de cada objeto de la mesa abierta. Tocar uno lo señala en la escena.
 */
@Component({
  selector: 'app-piece-list',
  templateUrl: './piece-list.html',
  styleUrl: './piece-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieceList {
  readonly items = input<readonly TableItem[]>([]);
  readonly choose = output<string>();
}

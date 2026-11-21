import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PieceChoice, partsOf, TableItem } from '../domain/mayo-table';

/**
 * La respuesta de «Instrumental» como lista: el número del diagrama de IQ y el
 * nombre de cada instrumento de la mesa abierta, uno por fila. Tocar uno señala su
 * objeto en la escena.
 */
@Component({
  selector: 'app-piece-list',
  templateUrl: './piece-list.html',
  styleUrl: './piece-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieceList {
  readonly items = input<readonly TableItem[]>([]);
  readonly choose = output<PieceChoice>();

  protected readonly entries = computed(() => partsOf(this.items()));
}

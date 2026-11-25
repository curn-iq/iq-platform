import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { PieceChoice, partsOf, TableItem, TablePart } from '../../domain/mayo-table';

/**
 * La leyenda plegable de la mesa: un botón con la cifra de instrumentos y la lista
 * con el número del diagrama de IQ y el nombre de cada uno, sin filas ni
 * columnas. Cada instrumento es una fila, también los que IQ arma juntos en un
 * mismo objeto (comparten número). Señalar uno marca su objeto a la vez en la
 * escena (`design/README.md`, «Leyenda plegable»).
 */
@Component({
  selector: 'app-legend',
  templateUrl: './legend.html',
  styleUrl: './legend.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Legend {
  readonly items = input<readonly TableItem[]>([]);
  readonly selected = input<string | null>(null);
  /** Cuál instrumento del objeto señalado se eligió; `null` si se señaló el objeto entero. */
  readonly part = input<number | null>(null);
  readonly open = model(true);
  /** Sin técnica abierta no hay leyenda. */
  readonly disabled = input(false);
  readonly choose = output<PieceChoice>();

  protected readonly entries = computed(() => partsOf(this.items()));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** La fila señalada: la elegida, o todas las del objeto si se señaló entero. */
  protected isCurrent(entry: TablePart): boolean {
    return (
      this.selected() === entry.item.id && (this.part() === null || this.part() === entry.index)
    );
  }

  constructor() {
    // La lista se desplaza hasta la pieza señalada
    afterRenderEffect(() => {
      if (this.selected() === null || !this.open()) return;
      this.host.nativeElement
        .querySelector('[aria-current="true"]')
        ?.scrollIntoView({ block: 'nearest' });
    });
  }
}

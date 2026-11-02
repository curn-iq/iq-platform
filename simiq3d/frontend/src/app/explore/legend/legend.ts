import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { TableItem } from '../../domain/mayo-table';

/**
 * La leyenda plegable de la mesa: un botón con la cifra de objetos y la lista
 * con el número del diagrama de IQ y el nombre de cada uno, sin filas ni
 * columnas. Señalar uno lo marca a la vez en la escena (`DESIGN.md`, «Leyenda
 * plegable»).
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
  readonly open = model(true);
  /** Sin técnica abierta no hay leyenda. */
  readonly disabled = input(false);
  readonly choose = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

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

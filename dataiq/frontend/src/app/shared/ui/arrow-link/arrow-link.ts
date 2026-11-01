import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Enlace con flecha, según «Buttons» de `DESIGN.md`: texto `marca` en 650 con una
 * flecha de 16 px que se desplaza 3 px al pasar el puntero. Se pone en un `<a>`:
 * `<a app-arrow-link routerLink="/tecnicas">Ver todas las técnicas</a>`. La flecha
 * va a la derecha (llevar a otra página) o hacia abajo (bajar a una sección).
 */
@Component({
  selector: 'a[app-arrow-link]',
  templateUrl: './arrow-link.html',
  styleUrl: './arrow-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-direction]': 'direction()' },
})
export class ArrowLink {
  readonly direction = input<'right' | 'down'>('right');
}

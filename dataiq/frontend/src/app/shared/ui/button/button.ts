import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Los botones que hay hasta ahora; cada casilla que use otro lo suma (ver «Buttons» en `DESIGN.md`). */
export type ButtonVariant = 'primary' | 'soft' | 'ghost';

/** `large` es el botón grande de «Buttons» en `DESIGN.md` (56 px). */
export type ButtonSize = 'default' | 'large';

/**
 * Botón de DataIQ, según «Buttons» de `DESIGN.md`. Se pone en un `<a>` o un
 * `<button>`: `<a app-button routerLink="/tecnicas">Ver todas las técnicas</a>`.
 * El primario es verde lleno; el suave, `marca-claro` sin sombra; el fantasma no
 * tiene fondo hasta que se le pasa el puntero.
 */
@Component({
  selector: 'a[app-button], button[app-button]',
  template: '<ng-content />',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-variant]': 'variant()', '[attr.data-size]': 'size()' },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('default');
}

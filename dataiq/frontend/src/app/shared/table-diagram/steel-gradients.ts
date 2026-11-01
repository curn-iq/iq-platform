import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Los degradados del acero y de la hoja (ver «Tertiary» en `DESIGN.md`). Sus `id`
 * son propios de cada dibujo, porque dos dibujos en una página no pueden
 * compartirlos: quien lo usa pasa los suyos y pone `--steel-fill` y `--blade-fill`
 * en su `<svg>` con `url(#id)`. Se pone dentro de un `<svg>`:
 * `<defs app-steel-gradients [steelId]="steelId" [bladeId]="bladeId" />`.
 */
@Component({
  selector: 'defs[app-steel-gradients]',
  templateUrl: './steel-gradients.html',
  styleUrl: './steel-gradients.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SteelGradients {
  readonly steelId = input.required<string>();
  readonly bladeId = input.required<string>();
}

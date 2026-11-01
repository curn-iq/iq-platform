import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Part } from './drawings';

/**
 * Las partes de un dibujo (`drawings.ts`) pintadas como SVG, sin `innerHTML`. Se
 * pone dentro de un `<svg>`: `<g app-drawing-parts [parts]="drawing.parts" />`.
 * Pinta el acero con `--steel-fill` y `--blade-fill`, que pone el `<svg>` que lo
 * contiene junto con sus degradados (`app-steel-gradients`). Lo comparten el
 * diagrama de mesa y la portada del inicio.
 */
@Component({
  selector: 'g[app-drawing-parts]',
  templateUrl: './drawing-parts.html',
  styleUrl: './drawing-parts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawingParts {
  readonly parts = input.required<readonly Part[]>();
}

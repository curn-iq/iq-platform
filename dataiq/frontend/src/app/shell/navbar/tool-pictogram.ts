import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ToolPictogramName } from './nav-menus';

/**
 * El pictograma de una herramienta (96 px, recuadro `marca-claro` con dibujo de
 * línea): documento con lista, cubo y visor de cámara. Ver «Herramientas» en
 * «Navigation» de `DESIGN.md`.
 */
@Component({
  selector: 'app-tool-pictogram',
  templateUrl: './tool-pictogram.html',
  styleUrl: './tool-pictogram.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolPictogram {
  readonly name = input.required<ToolPictogramName>();
}

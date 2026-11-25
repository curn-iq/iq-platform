import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import type { ToolPictogramName } from "./nav-menus";

/** Cuenta los pictogramas, para que cada degradado tenga su propio `id` en la página. */
let instances = 0;

/**
 * El pictograma de una herramienta (96 px, recuadro en `--color-accent-soft`):
 * documento con lista (DataIQ), la Q dibujada de SIMIQ3D y visor de cámara
 * (SIVRI). La Q lleva el degradado de la «Q» de la barra, de
 * `--color-brand-q-start` a `--color-brand-q-end`: plana en el acento en DataIQ y
 * SIVRI, y del lila a la orquídea en SIMIQ3D. Ver «Herramientas» en «Navegación»
 * de `design/README.md`.
 */
@Component({
  selector: "app-tool-pictogram",
  templateUrl: "./tool-pictogram.html",
  styleUrl: "./tool-pictogram.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolPictogram {
  readonly name = input.required<ToolPictogramName>();
  /** El degradado de la Q, con un `id` que no se repite si hay más de un pictograma. */
  protected readonly gradientId = `tool-pictogram-q-${++instances}`;
}

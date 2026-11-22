import { ChangeDetectionStrategy, Component } from "@angular/core";

/**
 * La mesa de Mayo de IQ Platform (isotipo de nivel 2), a 44 px: bandeja, paño, poste y base con
 * sus cuatro ruedas, en SVG en línea con los trazos del imagotipo compacto. Va en la barra
 * compartida, junto al nombre. Es decorativa: el enlace de la marca lleva su `aria-label`.
 */
@Component({
  selector: "app-brand-mark",
  templateUrl: "./brand-mark.html",
  styleUrl: "./brand-mark.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "aria-hidden": "true" },
})
export class BrandMark {}

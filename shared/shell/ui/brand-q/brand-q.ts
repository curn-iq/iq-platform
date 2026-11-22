import { ChangeDetectionStrategy, Component } from "@angular/core";

/**
 * La «Q» del logotipo de IQ Platform, con degradado, para el nombre en texto de una app (ver
 * `ShellBrand.drawnQ`). Es decorativa: el enlace de la marca lleva su `aria-label`. El dibujo es
 * `q.svg`, usado como máscara en `brand-q.scss`.
 */
@Component({
  selector: "app-brand-q",
  template: "",
  styleUrl: "./brand-q.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "aria-hidden": "true" },
})
export class BrandQ {}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLink } from '../../../shared/ui/arrow-link/arrow-link';
import { HomeCatalog } from '../home-catalog';

/**
 * «Técnicas por especialidad.»: el catálogo a lo ancho, una columna por
 * especialidad con sus técnicas como filas. Tocar una técnica abre su detalle (los
 * datos clínicos son libres; el resto pide cuenta allí mismo). Las técnicas y las
 * especialidades salen de la API. Ver «Catálogo por especialidad» en `DESIGN.md`.
 */
@Component({
  selector: 'app-home-specialties',
  imports: [ArrowLink, RouterLink],
  templateUrl: './specialties.html',
  styleUrl: './specialties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeSpecialties {
  protected readonly catalog = inject(HomeCatalog);
}

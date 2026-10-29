import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { BrandMark } from '../../shared/ui/brand-mark/brand-mark';
import { NavLink } from '../navbar/nav-link';
import { NAV_MENUS, NavMenuId, NavOption, specialtyTarget } from '../navbar/nav-menus';
import { Specialties } from '../specialties';

/** El año desde el que corre el derecho de autor del producto. */
const COPYRIGHT_YEAR = 2026;

/** Las opciones de un menú de la barra que también van en el pie. */
function footerOptions(id: NavMenuId): readonly NavOption[] {
  const options = NAV_MENUS.find((menu) => menu.id === id)?.options ?? [];
  return options.filter((option) => option.inFooter !== false);
}

/**
 * El pie oscuro: la marca con su frase y cuatro columnas, las mismas de la barra
 * (Herramientas, Especialidades, ¿Por qué IQ Platform?, Ayuda). Ver «Pie» en
 * «Navigation» de `DESIGN.md`.
 */
@Component({
  selector: 'app-footer',
  imports: [BrandMark, NavLink, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly specialties = inject(Specialties);
  protected readonly year = COPYRIGHT_YEAR;

  /** Las tres columnas con opciones fijas; Especialidades sale de la API. */
  protected readonly columns = {
    tools: footerOptions('tools'),
    why: footerOptions('why'),
    help: footerOptions('help'),
  };

  protected readonly specialtyLinks = computed(() =>
    this.specialties.list().map((specialty) => ({
      id: specialty.id,
      label: specialty.name,
      target: specialtyTarget(specialty.id),
    })),
  );

  constructor() {
    // El pie no se abre como los menús: si las especialidades no llegaron, se
    // vuelven a pedir al cambiar de página.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.specialties.retry());
  }
}

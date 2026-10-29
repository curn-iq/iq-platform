import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandMark } from '../../shared/ui/brand-mark/brand-mark';
import { CATALOG_ROUTE, NAV_MENUS, NavMenuId, NavOption } from '../navbar/nav-menus';
import { Specialties } from '../specialties';

/** El año desde el que corre el derecho de autor del producto. */
const COPYRIGHT_YEAR = 2026;

/** Las opciones del menú de Ayuda que van en el pie; las demás son de la barra. */
const HELP_IN_FOOTER = ['Preguntas frecuentes', 'Para docentes'];

/**
 * El pie oscuro: la marca con su frase y cuatro columnas, las mismas de la barra
 * (Herramientas, Especialidades, ¿Por qué IQ Platform?, Ayuda). Ver «Pie» en
 * «Navigation» de `DESIGN.md`.
 */
@Component({
  selector: 'app-footer',
  imports: [BrandMark, NgTemplateOutlet, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly specialties = inject(Specialties);
  protected readonly catalogRoute = CATALOG_ROUTE;
  protected readonly year = COPYRIGHT_YEAR;

  /** Las tres columnas con opciones fijas; Especialidades sale de la API. */
  protected readonly columns = computed(() => ({
    tools: this.options('tools'),
    why: this.options('why'),
    help: this.options('help').filter((option) => HELP_IN_FOOTER.includes(option.label)),
  }));

  private options(id: NavMenuId): readonly NavOption[] {
    return NAV_MENUS.find((menu) => menu.id === id)?.options ?? [];
  }
}

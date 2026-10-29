import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../core/session/session.service';
import { ROLE_LABELS } from '../../shared/role-labels';
import { Button } from '../../shared/ui/button/button';
import { managementLinks } from './management-links';
import { CATALOG_ROUTE, NAV_MENUS } from './nav-menus';
import { SpecialtiesNav } from './specialties-nav';

/**
 * El menú de la barra en celular (≤ 960 px): un panel a pantalla completa bajo
 * la barra con un grupo plegable por menú. Ver «Celular» en «Navigation» de
 * `DESIGN.md`. Se crea al abrirlo, así que las especialidades se piden entonces.
 */
@Component({
  selector: 'app-mobile-menu',
  imports: [Button, NgTemplateOutlet, RouterLink, RouterLinkActive],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    id: 'mobile-menu',
    role: 'navigation',
    'aria-label': 'Menú',
    '(click)': 'onClick($event)',
  },
})
export class MobileMenu {
  /** Se eligió una opción: el menú se cierra. */
  readonly chosen = output<void>();

  protected readonly menus = NAV_MENUS;
  protected readonly catalogRoute = CATALOG_ROUTE;
  protected readonly specialties = inject(SpecialtiesNav);
  protected readonly session = inject(SessionService);

  /** El rol de la cuenta, para decir quién es (el menú «repite nombre y rol» del panel de escritorio). */
  protected readonly roleLabel = computed(() => {
    const role = this.session.role();
    return role ? ROLE_LABELS[role] : '';
  });
  protected readonly links = computed(() => {
    const role = this.session.role();
    return role ? managementLinks(role) : [];
  });

  protected onClick(event: Event): void {
    if ((event.target as Element).closest('a')) this.chosen.emit();
  }
}

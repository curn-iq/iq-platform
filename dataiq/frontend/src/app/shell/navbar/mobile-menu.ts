import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PendingReviews } from '../../core/pending-reviews/pending-reviews';
import { SessionService } from '../../core/session/session.service';
import { ROLE_LABELS } from '../../shared/role-labels';
import { Button } from '../../shared/ui/button/button';
import { managementLinks } from './management-links';
import { NavLink } from './nav-link';
import { NAV_MENUS, specialtyTarget } from './nav-menus';
import { SignOut } from './sign-out';
import { SpecialtiesNav } from './specialties-nav';

/**
 * El menú de la barra en celular (≤ 960 px): un panel a pantalla completa bajo
 * la barra con un grupo plegable por menú. Ver «Celular» en «Navigation» de
 * `DESIGN.md`. Se crea al abrirlo, así que las técnicas de cada especialidad se
 * piden entonces (y lo que falló la última vez se vuelve a pedir).
 */
@Component({
  selector: 'app-mobile-menu',
  imports: [Button, NavLink, RouterLink, RouterLinkActive],
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
  protected readonly specialties = inject(SpecialtiesNav);
  protected readonly session = inject(SessionService);
  protected readonly signOut = inject(SignOut);
  private readonly pending = inject(PendingReviews);

  protected readonly specialtyLinks = computed(() =>
    this.specialties.entries().map((specialty) => ({
      id: specialty.id,
      label: specialty.name,
      target: specialtyTarget(specialty.id),
    })),
  );

  /** El rol de la cuenta, para decir quién es (el menú «repite nombre y rol» del panel de escritorio). */
  protected readonly roleLabel = computed(() => {
    const role = this.session.role();
    return role ? ROLE_LABELS[role] : '';
  });
  /** Los accesos del rol, cada uno con su cifra (`null` si no lleva o aún no se sabe). */
  protected readonly links = computed(() => {
    const role = this.session.role();
    return (role ? managementLinks(role) : []).map((link) => ({
      ...link,
      count: link.counter === 'pending_reviews' ? this.pending.count() : null,
    }));
  });

  constructor() {
    this.specialties.retry();
    // El menú se crea al abrirse: cada vez que se abre, la cifra se pide de nuevo
    this.pending.refresh();
  }

  /** Cierra la sesión y el menú; `SignOut` lleva al inicio si salió. */
  protected exit(): void {
    void this.signOut.run();
    this.chosen.emit();
  }

  protected onClick(event: Event): void {
    if ((event.target as Element).closest('a')) this.chosen.emit();
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PendingReviews } from '../../core/pending-reviews/pending-reviews';
import type { Account } from '../../data/api/models';
import { ROLE_LABELS } from '../../shared/role-labels';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { managementLinks } from './management-links';
import { SignOut } from './sign-out';

/**
 * El panel de «Mi cuenta»: quién es la persona, su rol y los accesos de gestión
 * que el rol permite, y al final «Cerrar sesión». Lo dibuja `Navbar` en un overlay anclado a la
 * derecha, bajo la barra. Ver «Mi cuenta (menú)» en `DESIGN.md`.
 */
@Component({
  selector: 'app-account-menu',
  imports: [Avatar, RouterLink, RouterLinkActive],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    id: 'account-menu',
    role: 'region',
    'aria-label': 'Mi cuenta',
    '(click)': 'onClick($event)',
  },
})
export class AccountMenu {
  protected readonly signOut = inject(SignOut);
  private readonly pending = inject(PendingReviews);

  readonly account = input.required<Account>();
  /** Se eligió un acceso o se salió: el panel se cierra. */
  readonly chosen = output<void>();

  protected readonly roleLabel = computed(() => ROLE_LABELS[this.account().role]);
  /** Los accesos del rol, cada uno con su cifra (`null` si no lleva o aún no se sabe). */
  protected readonly links = computed(() =>
    managementLinks(this.account().role).map((link) => ({
      ...link,
      count: link.counter === 'pending_reviews' ? this.pending.count() : null,
    })),
  );

  constructor() {
    // El panel se crea al abrirse: cada vez que se abre, la cifra se pide de nuevo
    this.pending.refresh();
  }

  /** Cierra la sesión y el panel; `SignOut` lleva al inicio si salió. */
  protected exit(): void {
    void this.signOut.run();
    this.chosen.emit();
  }

  protected onClick(event: Event): void {
    if ((event.target as Element).closest('a')) this.chosen.emit();
  }
}

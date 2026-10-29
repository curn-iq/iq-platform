import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { Account } from '../../data/api/models';
import { ROLE_LABELS } from '../../shared/role-labels';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { managementLinks } from './management-links';

/**
 * El panel de «Mi cuenta»: quién es la persona, su rol y los accesos de gestión
 * que el rol permite. Lo dibuja `Navbar` en un overlay anclado a la derecha, bajo
 * la barra. Ver «Mi cuenta (menú)» en `DESIGN.md`.
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
  readonly account = input.required<Account>();
  /** Se eligió un acceso: el panel se cierra. */
  readonly chosen = output<void>();

  protected readonly roleLabel = computed(() => ROLE_LABELS[this.account().role]);
  protected readonly links = computed(() => managementLinks(this.account().role));

  protected onClick(event: Event): void {
    if ((event.target as Element).closest('a')) this.chosen.emit();
  }
}

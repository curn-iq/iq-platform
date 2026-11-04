import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { splitEmail, type Person } from '../../../../domain/user-board';
import { Avatar } from '../../../../shared/ui/avatar/avatar';

/**
 * La fila de una persona en el tablero de Usuarios y roles, según «Usuarios y roles (página)» de
 * `DESIGN.md`: su avatar, el nombre (que puede partirse en dos renglones) y el correo, del que solo
 * se recorta la parte local. Es un botón: al elegirla, su ficha se abre a la derecha. La elegida va
 * en `marca-claro`.
 *
 * `arrived` es la fila que acaba de llegar a esta columna por un cambio de rol (entra desde arriba
 * con un lavado `marca-claro`), y `leaving` la que está por salir de ella.
 */
@Component({
  selector: 'button[app-person-row]',
  imports: [Avatar],
  templateUrl: './person-row.html',
  styleUrl: './person-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    '[attr.aria-pressed]': 'selected()',
    '[class.arrived]': 'arrived()',
    '[class.leaving]': 'leaving()',
  },
})
export class PersonRow {
  readonly person = input.required<Person>();
  readonly selected = input(false);
  readonly arrived = input(false);
  readonly leaving = input(false);

  protected readonly email = computed(() => splitEmail(this.person().email));
}

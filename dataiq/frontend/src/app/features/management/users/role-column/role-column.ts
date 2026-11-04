import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  COLUMN_TITLES,
  peopleWithRole,
  recentUsers,
  ROLE_CAPABILITIES,
  searchPeople,
  type Person,
} from '../../../../domain/user-board';
import type { Role } from '../../../../domain/role';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { PersonRow } from '../person-row/person-row';

/**
 * Una columna del tablero de Usuarios y roles, según «Usuarios y roles (página)» de `DESIGN.md`:
 * el nombre del rol con su cifra y lo que puede. Admin, Revisores y Colaboradores listan a todos.
 *
 * Usuarios son muchos y se buscan: en lugar de la lista, la cifra de cuentas con ese rol, su propio
 * buscador (que busca solo entre los usuarios y muestra las coincidencias aquí mismo, sin tocar el
 * buscador general), «Rol cambiado ahora» (quien acaba de llegar con ese rol, para que no
 * desaparezca de la vista) y «Registrados recientemente».
 */
@Component({
  selector: 'app-role-column',
  imports: [NgTemplateOutlet, PersonRow, SearchField],
  templateUrl: './role-column.html',
  styleUrl: './role-column.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleColumn {
  readonly role = input.required<Role>();
  /** Todas las cuentas: la columna toma las de su rol. */
  readonly people = input.required<readonly Person[]>();
  readonly selectedId = input<string | null>(null);
  /** La cuenta que acaba de llegar a una columna, y la que está por salir de la suya. */
  readonly arrivedId = input<string | null>(null);
  readonly leavingId = input<string | null>(null);
  /** Las cuentas que llegaron a Usuarios durante esta visita. */
  readonly justChangedIds = input<ReadonlySet<string>>(new Set());
  readonly chosen = output<Person>();

  protected readonly title = computed(() => COLUMN_TITLES[this.role()]);
  protected readonly capability = computed(() => ROLE_CAPABILITIES[this.role()]);
  protected readonly isUsers = computed(() => this.role() === 'user');

  protected readonly members = computed(() => peopleWithRole(this.people(), this.role()));

  // ---------- Solo en Usuarios ----------

  protected readonly query = signal('');
  protected readonly searching = computed(() => this.query().trim() !== '');
  protected readonly found = computed(() => searchPeople(this.people(), this.query(), 'user'));

  protected readonly justChanged = computed(() =>
    this.members().filter((person) => this.justChangedIds().has(person.id)),
  );
  protected readonly recent = computed(() => recentUsers(this.people(), this.justChangedIds()));
}

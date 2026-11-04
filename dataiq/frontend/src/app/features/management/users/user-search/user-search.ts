import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { highlight } from '../../../../domain/technique-search';
import { searchPeople, type Person } from '../../../../domain/user-board';
import { ROLE_LABELS } from '../../../../shared/role-labels';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { SearchField } from '../../../../shared/ui/search-field/search-field';

/**
 * El buscador general de Usuarios y roles, según «Usuarios y roles (página)» de `DESIGN.md`: busca
 * a cualquier persona por nombre o correo, sin importar el rol ni las tildes. Los resultados salen
 * en un desplegable con el tramo que coincide resaltado y la pastilla del rol a la derecha; el
 * desplegable muestra hasta `MAX_SEARCH_RESULTS` y dice cuántas coincidencias más hay. Elegir una
 * persona avisa con `chosen` y vacía el campo. Se cierra con Escape y con un clic fuera (sin borrar
 * lo escrito: seguir escribiendo lo vuelve a abrir).
 */
@Component({
  selector: 'app-user-search',
  imports: [Avatar, SearchField],
  templateUrl: './user-search.html',
  styleUrl: './user-search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeOnOutsideClick($event)',
    '(keydown.escape)': 'closed.set(true)',
  },
})
export class UserSearch {
  readonly people = input.required<readonly Person[]>();
  readonly chosen = output<Person>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly query = signal('');
  /** Se cerró con Escape o con un clic fuera; escribir otra vez lo abre. */
  protected readonly closed = signal(false);

  protected readonly open = computed(() => this.query().trim() !== '' && !this.closed());
  private readonly result = computed(() => searchPeople(this.people(), this.query()));
  protected readonly more = computed(() => this.result().more);

  /** Cada resultado con su nombre y su correo ya partidos en lo que coincide y lo demás. */
  protected readonly rows = computed(() =>
    this.result().shown.map((person) => ({
      person,
      name: highlight(person.name, this.query()),
      email: highlight(person.email, this.query()),
      role: ROLE_LABELS[person.role],
    })),
  );

  protected onQuery(value: string): void {
    this.query.set(value);
    this.closed.set(false);
  }

  protected choose(person: Person): void {
    this.query.set('');
    this.chosen.emit(person);
  }

  protected closeOnOutsideClick(event: Event): void {
    // `document:click` no sabe de este componente: se compara con su elemento
    if (!this.host.nativeElement.contains(event.target as Node)) this.closed.set(true);
  }
}

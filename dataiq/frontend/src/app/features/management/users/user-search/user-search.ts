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
import { plural } from '../../../../domain/plural';
import { highlight } from '../../../../domain/technique-search';
import { searchPeople, type Person } from '../../../../domain/user-board';
import { ROLE_LABELS } from '../../../../shared/role-labels';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { SearchField } from '../../../../shared/ui/search-field/search-field';

/** Lo que dice el desplegable cuando nadie coincide. */
const NO_MATCH = 'Nadie con ese nombre o correo.';

/**
 * El buscador general de Usuarios y roles, según «Usuarios y roles (página)» de `DESIGN.md`: busca
 * a cualquier persona por nombre o correo, sin importar el rol ni las tildes. Los resultados salen
 * en un desplegable con el tramo que coincide resaltado y la pastilla del rol a la derecha; el
 * desplegable muestra hasta `MAX_SEARCH_RESULTS` y dice cuántas coincidencias más hay. Elegir una
 * persona avisa con `chosen` y vacía el campo. Se cierra con Escape y con un clic fuera (sin borrar
 * lo escrito: seguir escribiendo o la flecha abajo lo vuelven a abrir).
 *
 * Con el teclado, la flecha abajo pasa del campo a los resultados y las flechas los recorren; la
 * flecha arriba desde el primero, o Escape desde cualquiera, devuelve el foco al campo. Cuántos
 * resultados hay se anuncia al lector de pantalla mientras se escribe.
 */
@Component({
  selector: 'app-user-search',
  imports: [Avatar, SearchField],
  templateUrl: './user-search.html',
  styleUrl: './user-search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeOnOutsideClick($event)',
    '(keydown.escape)': 'close($event)',
    '(keydown.arrowdown)': 'move($event, 1)',
    '(keydown.arrowup)': 'move($event, -1)',
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
  protected readonly noMatch = NO_MATCH;

  /** Cuántos resultados hay, para el lector de pantalla; nada con el desplegable cerrado. */
  protected readonly status = computed(() => {
    if (!this.open()) return '';
    const { shown, more } = this.result();
    const total = shown.length + more;
    return total === 0 ? NO_MATCH : plural(total, 'resultado', 'resultados');
  });

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

  /**
   * Escape cierra el desplegable. Un `<input type="search">` se vacía con Escape en Chromium y
   * WebKit: se evita, para que lo escrito se quede.
   */
  protected close(event: Event): void {
    if (this.query() !== '') event.preventDefault();
    const fromResult = this.resultButtons().includes(document.activeElement as HTMLButtonElement);
    this.closed.set(true);
    if (fromResult) this.field()?.focus();
  }

  /** Las flechas pasan del campo a los resultados y los recorren. */
  protected move(event: Event, step: 1 | -1): void {
    if (this.query().trim() === '') return;
    event.preventDefault();
    if (this.closed()) {
      if (step === 1) this.closed.set(false);
      return;
    }
    const buttons = this.resultButtons();
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = index + step;
    if (next < 0) this.field()?.focus();
    else buttons[Math.min(next, buttons.length - 1)]?.focus();
  }

  protected closeOnOutsideClick(event: Event): void {
    // `document:click` no sabe de este componente: se compara con su elemento
    if (!this.host.nativeElement.contains(event.target as Node)) this.closed.set(true);
  }

  private resultButtons(): HTMLButtonElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLButtonElement>('.results button'),
    );
  }

  private field(): HTMLInputElement | null {
    return this.host.nativeElement.querySelector('input');
  }
}

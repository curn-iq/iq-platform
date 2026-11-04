import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { hasFailed } from '../../../data/resource-state';
import { UsersRepository } from '../../../data/users.repository';
import { BOARD_ROLES, replacePerson, summaryLine, type Person } from '../../../domain/user-board';
import { mediaQuery, REDUCED_MOTION_QUERY } from '../../../shared/media-query';
import { Button } from '../../../shared/ui/button/button';
import { RoleColumn } from './role-column/role-column';
import { UserCard } from './user-card/user-card';
import { UserSearch } from './user-search/user-search';

/** Cuánto tarda en salir una fila de su columna (`leave` en `person-row.scss`). */
const LEAVE_MS = 280;
/** Cuánto dura el lavado de la fila que llega (`arrive` en `person-row.scss`). */
const ARRIVE_MS = 1200;

/** El punto de corte donde la ficha pasa debajo del tablero (`DESIGN.md`). */
const NARROW_QUERY = '(max-width: 1100px)';

/**
 * Usuarios y roles (`/gestion/usuarios`, `usuarios.html`), para el admin: las personas por rol, un
 * buscador, la ficha de la elegida y el cambio de rol. Los textos, de Juan (Resuelto 63 de
 * `dataiq/docs/checklist-frontend.md`). Ver «Usuarios y roles (página)» en `DESIGN.md`.
 *
 * Pide `GET /users` una vez, con todas las cuentas; cambiar un rol (`PATCH /users/{id}/role`)
 * reemplaza esa cuenta en la lista y no vuelve a pedirla. Suspender y el historial de roles no
 * están en el MVP (`docs/despues-del-mvp.md`).
 */
@Component({
  selector: 'app-users',
  imports: [Button, RoleColumn, UserCard, UserSearch],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Users {
  private readonly resource = inject(UsersRepository).list();
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly narrow = mediaQuery(NARROW_QUERY);
  private readonly reducedMotion = mediaQuery(REDUCED_MOTION_QUERY);
  private readonly cardPanel = viewChild<ElementRef<HTMLElement>>('cardPanel');
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  protected readonly roles = BOARD_ROLES;

  protected readonly loaded = computed(() => this.resource.hasValue());
  protected readonly failed = computed(() => hasFailed(this.resource));

  /** Todas las cuentas. Volver a pedirlas (Reintentar) la repone con lo que respondió la API. */
  protected readonly people = linkedSignal<readonly Person[] | undefined, readonly Person[]>({
    source: () => this.resource.value(),
    computation: (users) => users ?? [],
  });

  protected readonly summary = computed(() => summaryLine(this.people()));

  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(
    () => this.people().find((person) => person.id === this.selectedId()) ?? null,
  );

  /** Quienes llegaron a Usuarios durante esta visita: siguen a la vista aunque no sean recientes. */
  protected readonly justChanged = signal<ReadonlySet<string>>(new Set());
  /** La fila que está por salir de su columna y la que acaba de llegar a la suya. */
  protected readonly leavingId = signal<string | null>(null);
  protected readonly arrivedId = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach(clearTimeout));
  }

  protected select(person: Person): void {
    this.selectedId.set(person.id);
    // Donde la ficha queda bajo el tablero, la página baja hasta ella
    if (this.narrow()) {
      afterNextRender(
        () =>
          this.cardPanel()?.nativeElement.scrollIntoView({
            block: 'start',
            behavior: this.reducedMotion() ? 'auto' : 'smooth',
          }),
        { injector: this.injector },
      );
    }
  }

  /** «Volver a la lista»: devuelve la vista a la fila de la persona elegida. */
  protected backToList(): void {
    const row = this.host.nativeElement.querySelector<HTMLElement>(
      'button[app-person-row][aria-pressed="true"]',
    );
    row?.scrollIntoView({ block: 'center', behavior: this.reducedMotion() ? 'auto' : 'smooth' });
    row?.focus({ preventScroll: true });
  }

  /**
   * La API confirmó el cambio de rol. La fila sale de su columna y entra en la nueva (sin
   * animación con movimiento reducido).
   */
  protected roleChanged(updated: Person): void {
    const finish = () => {
      this.people.update((people) => replacePerson(people, updated));
      this.justChanged.update((ids) => {
        const next = new Set(ids);
        if (updated.role === 'user') next.add(updated.id);
        else next.delete(updated.id);
        return next;
      });
      this.leavingId.set(null);
      this.arrivedId.set(updated.id);
      this.later(() => this.arrivedId.set(null), ARRIVE_MS);
    };

    if (this.reducedMotion()) {
      finish();
    } else {
      this.leavingId.set(updated.id);
      this.later(finish, LEAVE_MS);
    }
  }

  protected retry(): void {
    this.resource.reload();
  }

  private later(action: () => void, ms: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      action();
    }, ms);
    this.timers.add(timer);
  }
}

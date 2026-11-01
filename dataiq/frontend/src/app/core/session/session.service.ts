import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, fromEvent, Observable, Subject, tap, timeout } from 'rxjs';
import type { Account, Credentials } from '../../data/api/models';
import { AuthRepository } from '../../data/auth.repository';
import { hasAtLeast, Role } from '../../domain/role';

/**
 * En qué punto está saber si hay sesión:
 * - `loading`: se está comprobando.
 * - `authenticated`: la API dijo quién es.
 * - `unauthenticated`: la API respondió 401, así que no hay sesión (no hay renovación de
 *   credenciales: el JWT dura 2 horas y no se renueva).
 * - `verification_unavailable`: no se pudo comprobar por sin conexión, un error del servidor o
 *   un tiempo agotado. Eso **no** dice que la sesión haya vencido.
 */
export type SessionStatus =
  'loading' | 'authenticated' | 'unauthenticated' | 'verification_unavailable';

/** Si `GET /auth/me` no responde en este tiempo se da por no disponible (un colgado no deja la app esperando). */
const VERIFICATION_TIMEOUT_MS = 15_000;

/** Cada reintento automático espera más que el anterior, hasta el último valor. */
const RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000];

/**
 * Quién está conectado. La cuenta sale de `GET /auth/me` y el rol solo decide qué
 * se muestra: quien permite o niega es la API.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthRepository);
  private readonly current = signal<Account | null>(null);
  private readonly done = signal(false);
  private readonly failed = signal(false);
  private loading: Promise<void> | undefined;
  // Cuántas rutas protegidas esperan que se sepa si hay sesión, y si alguna ya vio que no se pudo.
  private readonly waiting = signal(0);
  private readonly stalled = signal(false);
  // Lo que despierta a quien espera: «Reintentar», ingresar.
  private readonly wake = new Subject<void>();
  // Cuenta cuántas veces cambió la cuenta; sirve para no pisar un ingreso con
  // la respuesta tardía de `GET /auth/me`.
  private changes = 0;

  /**
   * Cambia cada vez que la cuenta cambia (ingresar, salir, olvidarla). Sirve
   * para saber si una respuesta es de antes de un cambio, p. ej. un 401 de una
   * petición que salió con la cookie vieja.
   */
  get generation(): number {
    return this.changes;
  }

  /** La cuenta conectada, o `null` si es un visitante (o aún no se sabe: ver `loaded`). */
  readonly account = this.current.asReadonly();
  /** `true` cuando ya se supo si hay sesión. Antes de eso un visitante y «aún no se sabe» se ven igual. */
  readonly loaded = this.done.asReadonly();
  /** `true` si la API no respondió a la última pregunta: no se sabe si hay sesión (ver `load`). */
  readonly loadFailed = this.failed.asReadonly();
  /** En qué punto está saber si hay sesión (ver `SessionStatus`). */
  readonly status = computed<SessionStatus>(() => {
    if (this.failed()) return 'verification_unavailable';
    if (!this.done()) return 'loading';
    return this.current() ? 'authenticated' : 'unauthenticated';
  });
  /**
   * `true` cuando una ruta protegida espera y ya se vio que no se puede comprobar la sesión:
   * es cuando la aplicación dice que no pudo comprobarla y ofrece reintentar.
   */
  readonly verificationBlocked = computed(() => this.waiting() > 0 && this.stalled());
  readonly isLoggedIn = computed(() => this.current() !== null);
  readonly role = computed<Role | null>(() => this.current()?.role ?? null);

  /**
   * Pide la cuenta a la API, una sola vez: quien llame de nuevo recibe la misma
   * promesa. Nunca se rechaza. Un 401 dice que es un visitante, y es definitivo. Si
   * la API no respondió (sin conexión, 5xx en un arranque en frío) no se sabe si hay
   * sesión: `loaded` sigue en `false`, `loadFailed` pasa a `true` y la próxima
   * llamada vuelve a preguntar (el error ya lo avisó el interceptor). Tomar a esa
   * persona por visitante le mostraría la puerta de cuenta aunque la tenga.
   */
  load(): Promise<void> {
    return this.ask(false);
  }

  /**
   * Espera a que se sepa si hay sesión y entonces emite una vez y completa; es lo que esperan
   * los guards. Si la API no responde **no emite**: la navegación queda en espera, con su URL, y
   * no se manda a ingresar a quien quizá tiene sesión. Mientras espera vuelve a preguntar solo,
   * en silencio y cada vez más despacio (5, 10, 20 y 30 s), al volver la conexión (`online`) y
   * cuando se pide con `retry()`. Si la navegación se cancela, deja de preguntar.
   */
  verified(): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.waiting.update((count) => count + 1);
      let timer: ReturnType<typeof setTimeout> | undefined;
      let attempts = 0;
      let running = false;
      let closed = false;

      const check = async (quiet: boolean): Promise<void> => {
        if (running || closed) return;
        running = true;
        clearTimeout(timer);
        try {
          await this.ask(quiet);
        } finally {
          running = false;
        }
        if (closed) return;
        if (!this.failed()) {
          closed = true;
          subscriber.next();
          subscriber.complete();
          return;
        }
        this.stalled.set(true);
        const delay = RETRY_DELAYS_MS[Math.min(attempts++, RETRY_DELAYS_MS.length - 1)];
        timer = setTimeout(() => void check(true), delay);
      };

      const woken = this.wake.subscribe(() => void check(false));
      const online = fromEvent(window, 'online').subscribe(() => void check(true));
      void check(false);

      return () => {
        closed = true;
        clearTimeout(timer);
        woken.unsubscribe();
        online.unsubscribe();
        this.waiting.update((count) => count - 1);
        if (this.waiting() === 0) this.stalled.set(false);
      };
    });
  }

  /** Vuelve a comprobar la sesión ahora, a pedido de la persona («Reintentar»). */
  retry(): void {
    this.wake.next();
  }

  /** Ingresa: la API deja la cookie y devuelve la cuenta. */
  login(credentials: Credentials): Observable<Account> {
    return this.auth.login(credentials).pipe(tap((account) => this.replace(account)));
  }

  /** Sale: la API borra la cookie. Si falla, la cuenta sigue, porque la cookie sigue. */
  logout(): Observable<void> {
    return this.auth.logout().pipe(tap(() => this.replace(null)));
  }

  /** Olvida la cuenta sin hablar con la API (p. ej. cuando una petición responde 401). */
  clear(): void {
    this.replace(null);
  }

  /** Dice si la cuenta conectada tiene ese rol o uno mayor. */
  hasRole(minimum: Role): boolean {
    const role = this.role();
    return role !== null && hasAtLeast(role, minimum);
  }

  private ask(quiet: boolean): Promise<void> {
    this.loading ??= this.fetchAccount(quiet);
    return this.loading;
  }

  private async fetchAccount(quiet: boolean): Promise<void> {
    const seen = this.changes;
    this.failed.set(false);
    let account: Account | null = null;
    let answered = true;
    try {
      account = await firstValueFrom(
        this.auth.me({ quiet }).pipe(timeout(VERIFICATION_TIMEOUT_MS)),
      );
    } catch (error) {
      // Un 401 es un visitante; lo demás lo avisó el interceptor y no dice si
      // la cookie sirve, así que se vuelve a preguntar en el próximo `load()`.
      answered = error instanceof HttpErrorResponse && error.status === 401;
    }
    if (this.changes !== seen) return;
    if (answered) {
      this.current.set(account);
      this.done.set(true);
    } else {
      this.loading = undefined;
      this.failed.set(true);
    }
  }

  // Ingresar, salir u olvidar la cuenta también dicen si hay sesión, aunque la
  // primera respuesta de `GET /auth/me` no haya llegado o no haya tenido respuesta.
  private replace(account: Account | null): void {
    this.changes++;
    this.loading ??= Promise.resolve();
    this.failed.set(false);
    this.current.set(account);
    this.done.set(true);
    // Quien esperaba la respuesta ya la tiene
    this.wake.next();
  }
}

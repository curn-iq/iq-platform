import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import type { Account, Credentials } from '../../data/api/models';
import { AuthRepository } from '../../data/auth.repository';
import { hasAtLeast, Role } from '../../domain/role';

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
    this.loading ??= this.fetchAccount();
    return this.loading;
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

  private async fetchAccount(): Promise<void> {
    const seen = this.changes;
    this.failed.set(false);
    let account: Account | null = null;
    let answered = true;
    try {
      account = await firstValueFrom(this.auth.me());
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
  }
}

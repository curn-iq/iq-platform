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
  private loading: Promise<void> | undefined;
  // Cuenta cuántas veces cambió la cuenta; sirve para no pisar un ingreso con
  // la respuesta tardía de `GET /auth/me`.
  private changes = 0;

  /** La cuenta conectada, o `null` si es un visitante (o aún no se sabe: ver `loaded`). */
  readonly account = this.current.asReadonly();
  /** `true` cuando ya se supo si hay sesión. Antes de eso un visitante y «aún no se sabe» se ven igual. */
  readonly loaded = this.done.asReadonly();
  readonly isLoggedIn = computed(() => this.current() !== null);
  readonly role = computed<Role | null>(() => this.current()?.role ?? null);

  /**
   * Pide la cuenta a la API, una sola vez: quien llame de nuevo recibe la misma
   * promesa. Nunca se rechaza: sin sesión, o si la API no responde, queda como
   * visitante (los errores que no son un 401 ya los avisó el interceptor).
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
    let account: Account | null = null;
    try {
      account = await firstValueFrom(this.auth.me());
    } catch {
      // Un 401 es un visitante; lo demás lo avisó el interceptor.
    }
    if (this.changes === seen) this.current.set(account);
    this.done.set(true);
  }

  private replace(account: Account | null): void {
    this.changes++;
    this.current.set(account);
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, fromEvent, race, Subject, timeout, timer } from 'rxjs';
import type { Account } from '../../data/api/models';
import { DataIQRepository } from '../../data/dataiq.repository';

/**
 * En qué punto está saber si hay sesión:
 * - `loading`: todavía no se preguntó, o se está preguntando.
 * - `authenticated`: DataIQ dijo quién es.
 * - `unauthenticated`: DataIQ respondió 401: no hay sesión, o venció (dura 2 horas).
 * - `unavailable`: DataIQ no respondió (sin conexión, un error del servidor, un
 *   arranque en frío que se pasó del tiempo). Eso no dice que la sesión haya vencido.
 */
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable';

/** Si `GET /auth/me` no responde en este tiempo, se da por no disponible. */
const CHECK_TIMEOUT_MS = 15_000;

/** Cada reintento automático espera más que el anterior, hasta el último valor. */
export const RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000];

/**
 * Quién está conectado, según la cookie de sesión de DataIQ (el único que emite
 * sesiones). Todo SIMIQ3D pide cuenta; quien permite o niega es cada API.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly dataiq = inject(DataIQRepository);
  private readonly current = signal<Account | null>(null);
  private readonly state = signal<SessionStatus>('loading');
  private asking: Promise<void> | undefined;
  // Lo que despierta a quien espera entre reintentos: «Reintentar».
  private readonly wake = new Subject<void>();

  /** La cuenta conectada, o `null`. */
  readonly account = this.current.asReadonly();
  /** En qué punto está saber si hay sesión (ver `SessionStatus`). */
  readonly status = this.state.asReadonly();

  /**
   * Pregunta a DataIQ quién es. Una pregunta a la vez: quien llame mientras va
   * una recibe la misma promesa. Nunca se rechaza.
   */
  check(): Promise<void> {
    this.asking ??= this.ask().finally(() => (this.asking = undefined));
    return this.asking;
  }

  /**
   * Espera a saber si hay sesión, como esperan las rutas: si DataIQ no responde
   * no da a nadie por visitante, porque eso lo mandaría a ingresar aunque tenga
   * sesión. Vuelve a preguntar sola, cada vez más despacio (5, 10, 20 y 30 s), al
   * volver la conexión y con `retry()`.
   */
  async known(): Promise<'authenticated' | 'unauthenticated'> {
    for (let attempt = 0; ; attempt++) {
      const status = this.state();
      if (status === 'authenticated' || status === 'unauthenticated') return status;
      if (status === 'unavailable' && attempt > 0) await this.pause(attempt - 1);
      await this.check();
      const answer = this.state();
      if (answer === 'authenticated' || answer === 'unauthenticated') return answer;
    }
  }

  /** Vuelve a preguntar ya, sin esperar el próximo reintento. */
  retry(): void {
    this.wake.next();
  }

  /** La sesión venció mientras se usaba la app (una API respondió 401). */
  expire(): void {
    this.current.set(null);
    this.state.set('unauthenticated');
  }

  private async ask(): Promise<void> {
    try {
      const account = await firstValueFrom(this.dataiq.me().pipe(timeout(CHECK_TIMEOUT_MS)));
      this.current.set(account);
      this.state.set('authenticated');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.expire();
      } else {
        this.state.set('unavailable');
      }
    }
  }

  private pause(attempt: number): Promise<unknown> {
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    return firstValueFrom(race(timer(delay), this.wake, fromEvent(globalThis, 'online')));
  }
}

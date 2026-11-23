import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataIQRepository } from '../../data/dataiq.repository';

/** Cuánto antes de que venza se renueva el token: el de DataIQ dura 5 minutos. */
export const RENEW_MARGIN_MS = 60_000;

/**
 * El token corto con el que SIVRI acepta al estudiante (`POST /auth/module-token` de
 * DataIQ, que pide la cookie de sesión y `X-IQ-Client: web`).
 *
 * - **Una petición a la vez:** quien lo pida mientras va una recibe la misma.
 * - **Se renueva antes de que venza:** mientras le queden más de `RENEW_MARGIN_MS`, se
 *   reutiliza; si no, se pide otro.
 * - **Un 401 de DataIQ es que la sesión terminó:** el error sigue hasta quien lo pidió y
 *   `unauthorizedInterceptor` lleva al ingreso; no se guarda nada.
 */
@Injectable({ providedIn: 'root' })
export class ModuleTokenService {
  private readonly dataiq = inject(DataIQRepository);
  private cached: { value: string; expiresAt: number } | undefined;
  private pending: Promise<string> | undefined;

  /** Un token vigente: el guardado si le queda vida, o uno nuevo. */
  get(): Promise<string> {
    if (this.cached && this.cached.expiresAt - Date.now() > RENEW_MARGIN_MS) {
      return Promise.resolve(this.cached.value);
    }
    return this.renew();
  }

  /** Pide uno nuevo ya, sin mirar el guardado (para renovar en una conexión abierta). */
  renew(): Promise<string> {
    this.pending ??= this.request().finally(() => (this.pending = undefined));
    return this.pending;
  }

  /** Cuántos milisegundos faltan para renovarlo (0 si ya toca o si no hay token). */
  untilRenewal(): number {
    if (!this.cached) return 0;
    return Math.max(0, this.cached.expiresAt - RENEW_MARGIN_MS - Date.now());
  }

  /** Olvida el token (al terminar la sesión). */
  forget(): void {
    this.cached = undefined;
  }

  private async request(): Promise<string> {
    const token = await firstValueFrom(this.dataiq.moduleToken());
    this.cached = {
      value: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000,
    };
    return token.access_token;
  }
}

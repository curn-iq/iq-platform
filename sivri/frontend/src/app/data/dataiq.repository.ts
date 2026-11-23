import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DATAIQ_API } from './api-base-url';
import type { Account, ModuleToken, TechniqueSummary } from './api/models';

/**
 * Lo que SIVRI lee de DataIQ: la cuenta, el token corto para hablar con SIVRI y las
 * técnicas (para el menú de la barra). SIVRI no guarda nada del catálogo: DataIQ es la
 * única fuente. Las lecturas son `httpResource`: se crean en un contexto de inyección.
 */
@Injectable({ providedIn: 'root' })
export class DataIQRepository {
  private readonly http = inject(HttpClient);
  private readonly base = inject(DATAIQ_API);

  /** La cuenta de la cookie de sesión; un 401 dice que no hay sesión. */
  me(): Observable<Account> {
    return this.http.get<Account>(`${this.base}/auth/me`);
  }

  /** Borra la cookie de sesión. */
  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/logout`, null);
  }

  /**
   * El token corto (5 minutos) con el que SIVRI acepta al estudiante. Pide la cookie de
   * sesión y `X-IQ-Client: web`; un 401 es que la sesión terminó.
   */
  moduleToken(): Observable<ModuleToken> {
    return this.http.post<ModuleToken>(`${this.base}/auth/module-token`, null);
  }

  /** Las especialidades, en el orden en que el shell las muestra (para el menú de la barra). */
  specialties(): HttpResourceRef<{ id: string; name: string }[] | undefined> {
    return httpResource<{ id: string; name: string }[]>(() => `${this.base}/specialties`);
  }

  /** Técnicas publicadas, por nombre. */
  techniques(): HttpResourceRef<TechniqueSummary[] | undefined> {
    return httpResource<TechniqueSummary[]>(() => `${this.base}/techniques`);
  }
}

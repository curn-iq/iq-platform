import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import type { Account, Credentials, Registration } from './api/models';

/**
 * Sesión de la cuenta. Todo es de una sola vez (no se muestra en una pantalla),
 * así que devuelve `Observable`. La cookie la pone y la borra la API: aquí no
 * se ve el token. `POST /auth/token` es para lo que no es navegador y no se usa.
 */
@Injectable({ providedIn: 'root' })
export class AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** La cuenta de quien hace la petición. Responde 401 si no hay sesión. */
  me(): Observable<Account> {
    return this.http.get<Account>(`${this.base}/auth/me`);
  }

  /** Deja la cookie de sesión y devuelve la cuenta. */
  login(credentials: Credentials): Observable<Account> {
    return this.http.post<Account>(`${this.base}/auth/login`, credentials);
  }

  /** Crea la cuenta con rol `user`. No inicia sesión. */
  register(registration: Registration): Observable<Account> {
    return this.http.post<Account>(`${this.base}/auth/register`, registration);
  }

  /** Borra la cookie de sesión. */
  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/logout`, null);
  }
}

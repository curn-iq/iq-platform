import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Role } from '../domain/role';
import { API_BASE_URL } from './api-base-url';
import type { User } from './api/models';

/** Cuentas y sus roles. Solo admin. */
@Injectable({ providedIn: 'root' })
export class UsersRepository {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** Todas las cuentas, con cuándo se registraron y qué política aceptaron. */
  list(): HttpResourceRef<User[] | undefined> {
    return httpResource<User[]>(() => `${this.base}/users`);
  }

  /** Asigna el rol de una cuenta. La API no deja cambiar el de la propia (409). */
  changeRole(id: string, role: Role): Observable<User> {
    return this.http.patch<User>(`${this.base}/users/${encodeURIComponent(id)}/role`, { role });
  }
}

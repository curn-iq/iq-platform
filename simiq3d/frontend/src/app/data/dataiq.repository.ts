import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DATAIQ_API } from './api-base-url';
import type {
  Account,
  Instrument,
  TechniqueInstruments,
  TechniquePublic,
  TechniqueSummary,
} from './api/models';

/**
 * Lo que SIMIQ3D lee de DataIQ: la cuenta, las técnicas, la mesa de cada una y
 * la descripción de cada instrumento. SIMIQ3D no guarda nada de esto: DataIQ es
 * la única fuente del catálogo. Las lecturas son `httpResource`: se crean en un
 * contexto de inyección (p. ej. al declarar el campo de un componente) y un `id`
 * indefinido deja el recurso quieto, sin pedir nada.
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

  /** Las especialidades, en el orden en que el shell las muestra (para el menú de la barra). */
  specialties(): HttpResourceRef<{ id: string; name: string }[] | undefined> {
    return httpResource<{ id: string; name: string }[]>(() => `${this.base}/specialties`);
  }

  /** Técnicas publicadas, por nombre. */
  techniques(): HttpResourceRef<TechniqueSummary[] | undefined> {
    return httpResource<TechniqueSummary[]>(() => `${this.base}/techniques`);
  }

  /** Datos clínicos de la versión publicada. */
  technique(id: () => string | undefined): HttpResourceRef<TechniquePublic | undefined> {
    return httpResource<TechniquePublic>(() => {
      const techniqueId = id();
      return techniqueId === undefined ? undefined : this.techniqueUrl(techniqueId);
    });
  }

  /** Las mesas de la técnica con sus objetos y celdas. Pide cuenta. */
  tables(id: () => string | undefined): HttpResourceRef<TechniqueInstruments | undefined> {
    return httpResource<TechniqueInstruments>(() => {
      const techniqueId = id();
      return techniqueId === undefined
        ? undefined
        : `${this.techniqueUrl(techniqueId)}/instruments`;
    });
  }

  /** El instrumental del catálogo, con la descripción que muestra la ficha. Pide cuenta. */
  instruments(): HttpResourceRef<Instrument[] | undefined> {
    return httpResource<Instrument[]>(() => `${this.base}/instruments`);
  }

  private techniqueUrl(id: string): string {
    return `${this.base}/techniques/${encodeURIComponent(id)}`;
  }
}

import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import type {
  Specialty,
  TechniqueCreate,
  TechniqueInstruments,
  TechniquePublic,
  TechniqueSummary,
  VersionDetail,
} from './api/models';

/**
 * Técnicas y especialidades. Las lecturas son `httpResource`: se crean en un
 * contexto de inyección (p. ej. al declarar el campo de un componente) y un `id`
 * indefinido deja el recurso quieto, sin pedir nada.
 */
@Injectable({ providedIn: 'root' })
export class TechniquesRepository {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** Técnicas publicadas, por nombre. Público. */
  list(): HttpResourceRef<TechniqueSummary[] | undefined> {
    return httpResource<TechniqueSummary[]>(() => `${this.base}/techniques`);
  }

  /** Las especialidades, para filtrar el catálogo y elegir la de una técnica nueva. Público. */
  specialties(): HttpResourceRef<Specialty[] | undefined> {
    return httpResource<Specialty[]>(() => `${this.base}/specialties`);
  }

  /** Datos clínicos de la versión publicada. Público. */
  get(id: () => string | undefined): HttpResourceRef<TechniquePublic | undefined> {
    return httpResource<TechniquePublic>(() => {
      const techniqueId = id();
      return techniqueId === undefined ? undefined : this.techniqueUrl(techniqueId);
    });
  }

  /** Objetos con su mesa y celdas, suturas, equipos y dispositivos. Pide cuenta. */
  instruments(id: () => string | undefined): HttpResourceRef<TechniqueInstruments | undefined> {
    return httpResource<TechniqueInstruments>(() => {
      const techniqueId = id();
      return techniqueId === undefined
        ? undefined
        : `${this.techniqueUrl(techniqueId)}/instruments`;
    });
  }

  /** Crea la técnica con su versión 1 vacía, en borrador. Desde colaborador. */
  create(technique: TechniqueCreate): Observable<VersionDetail> {
    return this.http.post<VersionDetail>(`${this.base}/techniques`, technique);
  }

  /** Copia la versión publicada en una versión nueva en borrador. Desde colaborador. */
  createVersion(id: string): Observable<VersionDetail> {
    return this.http.post<VersionDetail>(`${this.techniqueUrl(id)}/versions`, null);
  }

  /** Retira la técnica: su versión publicada pasa a archivada. Desde revisor. */
  archive(id: string): Observable<void> {
    return this.http.post<void>(`${this.techniqueUrl(id)}/archive`, null);
  }

  private techniqueUrl(id: string): string {
    return `${this.base}/techniques/${encodeURIComponent(id)}`;
  }
}

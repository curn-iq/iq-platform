import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { VersionState } from '../domain/version-state';
import { API_BASE_URL } from './api-base-url';
import type { VersionContent, VersionDetail, VersionSummary } from './api/models';

/** Filtros de `GET /versions`. Sin ninguno, la API devuelve las versiones en curso. */
export interface VersionsFilter {
  state?: readonly VersionState[];
  /** Solo las que creó quien pregunta. */
  mine?: boolean;
  /** Las de otros que quien pregunta aprobó o rechazó. Desde revisor. */
  reviewedByMe?: boolean;
}

/**
 * Versiones de las técnicas y su ciclo (editar, enviar, publicar, aprobar,
 * devolver). Las lecturas son `httpResource`; las escrituras, `Observable`.
 */
@Injectable({ providedIn: 'root' })
export class VersionsRepository {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** Versiones según el filtro. Un filtro indefinido deja el recurso quieto. */
  list(
    filter: () => VersionsFilter | undefined = () => ({}),
  ): HttpResourceRef<VersionSummary[] | undefined> {
    return httpResource<VersionSummary[]>(() => {
      const f = filter();
      if (f === undefined) return undefined;
      const params: Record<string, string | boolean | readonly string[]> = {};
      if (f.state?.length) params['state'] = f.state;
      if (f.mine !== undefined) params['mine'] = f.mine;
      if (f.reviewedByMe !== undefined) params['reviewed_by_me'] = f.reviewedByMe;
      return { url: `${this.base}/versions`, params };
    });
  }

  /** Una versión con todo su contenido y sus rechazos. */
  get(id: () => string | undefined): HttpResourceRef<VersionDetail | undefined> {
    return httpResource<VersionDetail>(() => {
      const versionId = id();
      return versionId === undefined ? undefined : this.versionUrl(versionId);
    });
  }

  /** Reemplaza todo el contenido de un borrador propio. */
  update(id: string, content: VersionContent): Observable<VersionDetail> {
    return this.http.put<VersionDetail>(this.versionUrl(id), content);
  }

  /** Descarta un borrador. Lo publicado no se borra: se archiva. */
  discard(id: string): Observable<void> {
    return this.http.delete<void>(this.versionUrl(id));
  }

  /** Manda un borrador propio a revisión. */
  submit(id: string): Observable<void> {
    return this.http.post<void>(`${this.versionUrl(id)}/submit`, null);
  }

  /** Un revisor o un admin publica su propio borrador sin pasar por revisión. */
  publish(id: string): Observable<void> {
    return this.http.post<void>(`${this.versionUrl(id)}/publish`, null);
  }

  /** Aprueba una versión en revisión y queda publicada. Responde 409 si otro ya decidió. */
  approve(id: string): Observable<void> {
    return this.http.post<void>(`${this.versionUrl(id)}/approve`, null);
  }

  /** Devuelve una versión en revisión a borrador, con el motivo. Responde 409 si otro ya decidió. */
  reject(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.versionUrl(id)}/reject`, { reason });
  }

  private versionUrl(id: string): string {
    return `${this.base}/versions/${encodeURIComponent(id)}`;
  }
}

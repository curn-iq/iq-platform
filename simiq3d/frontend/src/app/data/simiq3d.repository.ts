import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SIMIQ3D_API } from './api-base-url';
import type { ChatReply, ModelFile } from './api/models';

/** El backend de SIMIQ3D: el chat y qué modelo 3D dibuja cada instrumento. Todo pide cuenta. */
@Injectable({ providedIn: 'root' })
export class Simiq3dRepository {
  private readonly http = inject(HttpClient);
  private readonly base = inject(SIMIQ3D_API);

  /** El GLB de cada instrumento de DataIQ que tiene modelo. */
  models(): HttpResourceRef<ModelFile[] | undefined> {
    return httpResource<ModelFile[]>(() => `${this.base}/models`);
  }

  /**
   * Una pregunta al chat, con la técnica abierta en el visor (si hay una) para que
   * «¿y dónde va la Kelly?» se entienda en esa técnica.
   */
  ask(question: string, techniqueId: string | null): Observable<ChatReply> {
    return this.http.post<ChatReply>(`${this.base}/chat`, {
      question,
      technique_id: techniqueId,
    });
  }
}

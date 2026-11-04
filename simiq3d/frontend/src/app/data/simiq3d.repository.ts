import { HttpClient, HttpEventType, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, EMPTY, from, mergeMap, Observable } from 'rxjs';
import { SIMIQ3D_API } from './api-base-url';
import type { ChatStreamEvent, ChatTurn, ModelFile } from './api/models';
import { NdjsonReader } from './ndjson';

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
   * «¿y dónde va la Kelly?» se entienda en esa técnica, y las preguntas anteriores con
   * sus pedidos y su texto, para que «¿y para qué sirve?» se entienda por lo que se
   * preguntó antes. La respuesta llega a medida que se escribe (`POST /chat/stream`):
   * primero `start` (lo que hace el visor), después cada `text` y al final `end` (la
   * respuesta completa). Si algo en el camino junta la respuesta, llegan todos juntos.
   */
  ask(
    question: string,
    techniqueId: string | null,
    previous: readonly ChatTurn[] = [],
  ): Observable<ChatStreamEvent> {
    return defer(() => {
      const reader = new NdjsonReader<ChatStreamEvent>();
      return this.http
        .post(
          `${this.base}/chat/stream`,
          { question, technique_id: techniqueId, previous },
          { observe: 'events', reportProgress: true, responseType: 'text' },
        )
        .pipe(
          mergeMap((event) => {
            if (event.type === HttpEventType.DownloadProgress && event.partialText) {
              return from(reader.read(event.partialText));
            }
            if (event.type === HttpEventType.Response) {
              return from(reader.read(event.body ?? '', true));
            }
            return EMPTY;
          }),
        );
    });
  }
}

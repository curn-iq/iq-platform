import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import type { FullCatalog, Instrument, InstrumentCreate, InstrumentUpdate } from './api/models';

/**
 * Catálogo de instrumental. Todo pide cuenta; crear y editar, desde revisor.
 * Las lecturas son `httpResource`; las escrituras, `Observable`.
 */
@Injectable({ providedIn: 'root' })
export class CatalogRepository {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** Todo el catálogo y todas las técnicas publicadas con su detalle, de una vez. */
  full(): HttpResourceRef<FullCatalog | undefined> {
    return httpResource<FullCatalog>(() => `${this.base}/catalog/full`);
  }

  /** Instrumental con su categoría y sus alias. */
  instruments(): HttpResourceRef<Instrument[] | undefined> {
    return httpResource<Instrument[]>(() => `${this.base}/instruments`);
  }

  /** Agrega un instrumento. Una descripción va con su fuente (`description_source`). */
  createInstrument(instrument: InstrumentCreate): Observable<Instrument> {
    return this.http.post<Instrument>(`${this.base}/instruments`, instrument);
  }

  /** Cambia un instrumento. La lista de alias que se manda reemplaza la anterior. */
  updateInstrument(id: string, changes: InstrumentUpdate): Observable<Instrument> {
    return this.http.patch<Instrument>(
      `${this.base}/instruments/${encodeURIComponent(id)}`,
      changes,
    );
  }
}

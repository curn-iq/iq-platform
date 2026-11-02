import type { HttpResourceRef } from '@angular/common/http';
import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import type { FullCatalog } from '../../../data/api/models';
import { CatalogRepository } from '../../../data/catalog.repository';

/**
 * El catálogo completo (`GET /catalog/full`) que usan los pasos de instrumental y de las mesas. Se provee
 * en `Editor`: se pide la primera vez que un paso lo usa y se comparte mientras dure la pantalla, así que
 * cambiar de paso no lo vuelve a pedir (cada paso se crea de nuevo al abrirlo).
 */
@Injectable()
export class EditorCatalog {
  private readonly injector = inject(Injector);
  private resource: HttpResourceRef<FullCatalog | undefined> | undefined;

  /** El catálogo; la primera llamada lo pide. */
  use(): HttpResourceRef<FullCatalog | undefined> {
    this.resource ??= runInInjectionContext(this.injector, () => inject(CatalogRepository).full());
    return this.resource;
  }
}

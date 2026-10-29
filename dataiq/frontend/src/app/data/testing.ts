import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

/**
 * Base de las rutas en las pruebas de los repositorios. Es distinta a la de
 * producción (`API_BASE` en `core/http`) a propósito: así las pruebas comprueban
 * que cada repositorio usa la base que recibe de `API_BASE_URL` y no una escrita
 * a mano. Que la de producción sea `/api/dataiq` lo prueba `api.providers.spec.ts`.
 */
export const TEST_API_BASE = '/api-de-prueba';

/** Lo que necesita una prueba de un repositorio: HttpClient de prueba y la base de la API. */
export function provideRepositoryTesting(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: TEST_API_BASE },
  ];
}

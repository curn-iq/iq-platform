import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

/** Base de las rutas en las pruebas de los repositorios. */
export const TEST_API_BASE = '/api/dataiq';

/** Lo que necesita una prueba de un repositorio: HttpClient de prueba y la base de la API. */
export function provideRepositoryTesting(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: TEST_API_BASE },
  ];
}

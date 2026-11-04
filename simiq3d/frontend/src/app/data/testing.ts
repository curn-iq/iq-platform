import { HttpFeature, HttpFeatureKind, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { DATAIQ_API, SIMIQ3D_API } from './api-base-url';

/**
 * Bases de las rutas en las pruebas. Son distintas a las de producción
 * (`core/http`) a propósito: así las pruebas comprueban que cada repositorio usa
 * la base que recibe y no una escrita a mano.
 */
export const TEST_DATAIQ = '/dataiq-de-prueba';
export const TEST_SIMIQ3D = '/simiq3d-de-prueba';

/** HttpClient de prueba y las bases de las dos APIs. */
export function provideRepositoryTesting(
  ...features: HttpFeature<HttpFeatureKind>[]
): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(...features),
    provideHttpClientTesting(),
    { provide: DATAIQ_API, useValue: TEST_DATAIQ },
    { provide: SIMIQ3D_API, useValue: TEST_SIMIQ3D },
  ];
}

/**
 * Una respuesta del chat como la manda `POST /chat/stream`: `start` sin texto, el texto
 * en las partes dadas (o entero) y `end` con la respuesta completa.
 */
export function streamed<T extends { reply: string }>(
  reply: T,
  parts: string[] = [reply.reply],
): string {
  return [
    { ...reply, type: 'start', reply: '' },
    ...parts.map((text) => ({ type: 'text', text })),
    { ...reply, type: 'end' },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');
}

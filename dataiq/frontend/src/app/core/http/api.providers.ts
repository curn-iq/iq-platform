import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { API_BASE_URL } from '../../data/api-base-url';
import { clientHeaderInterceptor } from './client-header.interceptor';
import { errorInterceptor } from './error.interceptor';

/**
 * Por dónde se llega a la API de DataIQ: el mismo origen, por el proxy
 * (`proxy.conf.json` en desarrollo, los rewrites de Vercel en producción). Sin
 * CORS ni `withCredentials`: la cookie de sesión viaja sola.
 */
export const API_BASE = '/api/dataiq';

/** HttpClient (con `fetch`), sus interceptores y la base de la API para `data/`. */
export function provideApi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(withFetch(), withInterceptors([clientHeaderInterceptor, errorInterceptor])),
    { provide: API_BASE_URL, useValue: API_BASE },
  ]);
}

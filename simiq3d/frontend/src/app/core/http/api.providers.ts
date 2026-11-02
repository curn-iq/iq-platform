import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { DATAIQ_API, SIMIQ3D_API } from '../../data/api-base-url';
import { clientHeaderInterceptor } from './client-header.interceptor';
import { unauthorizedInterceptor } from './unauthorized.interceptor';

/**
 * Por dónde se llega a cada API: el mismo origen, por el proxy (`proxy.conf.json`
 * en desarrollo, los rewrites de Vercel en producción). Sin CORS ni
 * `withCredentials`: la cookie de sesión viaja sola.
 */
export const DATAIQ_BASE = '/api/dataiq';
export const SIMIQ3D_BASE = '/api/simiq3d';

/** HttpClient (con `fetch`), sus interceptores y la base de cada API para `data/`. */
export function provideApi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(
      withFetch(),
      withInterceptors([clientHeaderInterceptor, unauthorizedInterceptor]),
    ),
    { provide: DATAIQ_API, useValue: DATAIQ_BASE },
    { provide: SIMIQ3D_API, useValue: SIMIQ3D_BASE },
  ]);
}

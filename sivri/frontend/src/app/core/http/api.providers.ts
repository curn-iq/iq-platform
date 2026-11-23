import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { environment } from '../../../environments/environment';
import { DATAIQ_API, SIVRI_API } from '../../data/api-base-url';
import { DATAIQ_BASE } from './bases';
import { clientHeaderInterceptor } from './client-header.interceptor';
import { unauthorizedInterceptor } from './unauthorized.interceptor';

/**
 * HttpClient (con `fetch`), sus interceptores y la base de cada API para `data/`.
 * DataIQ se pide por el mismo origen (`proxy.conf.json` en desarrollo, los rewrites de
 * Vercel en producción), con la cookie de sesión. SIVRI se pide directo, porque está en
 * otro dominio: sin cookie y con el token corto en `Authorization`.
 */
export function provideApi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(
      withFetch(),
      withInterceptors([clientHeaderInterceptor, unauthorizedInterceptor]),
    ),
    { provide: DATAIQ_API, useValue: DATAIQ_BASE },
    { provide: SIVRI_API, useValue: environment.sivriApiUrl },
  ]);
}

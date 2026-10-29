import { HttpInterceptorFn } from '@angular/common/http';

/** Encabezado que la API exige en las escrituras con cookie, el login y el logout (contra CSRF). */
export const CLIENT_HEADER = 'X-IQ-Client';

/** Pone `X-IQ-Client: web` en todas las peticiones. */
export const clientHeaderInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { [CLIENT_HEADER]: 'web' } }));

import { HttpInterceptorFn } from '@angular/common/http';

/** Encabezado que las APIs exigen en las escrituras con cookie (contra CSRF). */
export const CLIENT_HEADER = 'X-IQ-Client';

/** Pone `X-IQ-Client: web` en todas las peticiones, como el frontend de DataIQ. */
export const clientHeaderInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { [CLIENT_HEADER]: 'web' } }));

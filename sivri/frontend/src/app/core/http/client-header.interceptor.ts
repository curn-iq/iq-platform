import { HttpInterceptorFn } from '@angular/common/http';
import { isDataIQRequest } from './bases';

/** Encabezado que DataIQ exige en las escrituras con cookie (contra CSRF). */
export const CLIENT_HEADER = 'X-IQ-Client';

/**
 * Pone `X-IQ-Client: web` en las peticiones a DataIQ, como el frontend de DataIQ. No en las
 * de SIVRI: son de otro origen y su CORS solo admite `Authorization` y `Content-Type`; con
 * este encabezado el navegador las rechazaría.
 */
export const clientHeaderInterceptor: HttpInterceptorFn = (req, next) =>
  isDataIQRequest(req.url)
    ? next(req.clone({ setHeaders: { [CLIENT_HEADER]: 'web' } }))
    : next(req);

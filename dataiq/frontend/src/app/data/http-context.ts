import { HttpContextToken } from '@angular/common/http';

/**
 * Marca una petición que se repite sola, sin que la persona la haya pedido (p. ej. volver a
 * comprobar la sesión mientras la API no responde): si falla, el interceptor de errores no
 * la avisa. Avisar cada intento repetiría el mismo mensaje cada pocos segundos.
 */
export const QUIET_ERRORS = new HttpContextToken<boolean>(() => false);

import { HttpContextToken } from '@angular/common/http';

/**
 * Marca una petición que se repite sola, sin que la persona la haya pedido (p. ej. volver a
 * comprobar la sesión mientras la API no responde): si falla, el interceptor de errores no
 * la avisa. Avisar cada intento repetiría el mismo mensaje cada pocos segundos.
 */
export const QUIET_ERRORS = new HttpContextToken<boolean>(() => false);

/**
 * Los códigos de error que la pantalla trata por su cuenta (p. ej. el 409 de «ya existe esa
 * técnica»): el interceptor de errores no los avisa, pero sigue tratando todos los demás, entre
 * ellos el 401 de una sesión vencida, que `QUIET_ERRORS` también dejaría pasar.
 */
export const HANDLED_STATUSES = new HttpContextToken<readonly number[]>(() => []);

import { InjectionToken } from '@angular/core';

/**
 * Bases de las rutas de cada API. Las da `core/http`: `data/` solo sabe cómo son las
 * rutas, no por dónde se llega a ellas.
 *
 * - `DATAIQ_API`: `/api/dataiq`, el mismo origen (la cookie de sesión viaja sola).
 * - `SIVRI_API`: la dirección directa del backend de SIVRI (otro dominio, sin cookie:
 *   el token corto va en `Authorization: Bearer`).
 */
export const DATAIQ_API = new InjectionToken<string>('DATAIQ_API');
export const SIVRI_API = new InjectionToken<string>('SIVRI_API');

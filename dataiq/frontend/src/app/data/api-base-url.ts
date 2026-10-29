import { InjectionToken } from '@angular/core';

/**
 * Base de las rutas de la API (p. ej. `/api/dataiq`). La da `core/http`: `data/`
 * solo sabe cómo son las rutas, no por dónde se llega a ellas.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

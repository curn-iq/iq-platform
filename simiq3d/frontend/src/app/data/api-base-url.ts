import { InjectionToken } from '@angular/core';

/**
 * Bases de las rutas de cada API (p. ej. `/api/dataiq`). Las da `core/http`:
 * `data/` solo sabe cómo son las rutas, no por dónde se llega a ellas.
 */
export const DATAIQ_API = new InjectionToken<string>('DATAIQ_API');
export const SIMIQ3D_API = new InjectionToken<string>('SIMIQ3D_API');

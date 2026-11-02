import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Dónde se sirve esta app (`baseHref` de `angular.json`). */
export const APP_BASE_PATH = '/simiq3d';

/**
 * La pantalla de ingreso del shell, con `?volver=` a la ruta de esta app. El
 * shell solo vuelve a rutas de su mismo origen: en producción lo es, y en
 * desarrollo (shell en el puerto 4200, esta app en el 4300) hay que volver a
 * mano. `path` es la ruta del router de esta app, sin la base («/tecnicas/…»).
 */
export function loginUrl(path: string): string {
  const back = `${APP_BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
  return `${environment.shellUrl}/cuenta/ingresar?volver=${encodeURIComponent(back)}`;
}

/** Ir al shell, que es otra app: navegación completa, no el router de esta. */
@Injectable({ providedIn: 'root' })
export class ShellNavigation {
  private readonly location = inject(DOCUMENT).location;

  /** Al ingreso del shell; después vuelve a `path`. */
  goToLogin(path: string): void {
    this.location.assign(loginUrl(path));
  }
}

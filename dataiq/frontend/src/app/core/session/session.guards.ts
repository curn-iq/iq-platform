import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import type { Role } from '../../domain/role';
import { NO_PERMISSION } from '../http/error-message';
import { NoticeService } from '../notice/notice.service';
import { LOGIN_PATH } from './login-path';
import { SessionService } from './session.service';

/** A ingresar, con la ruta a la que se iba en `?volver=`. */
function toLogin(router: Router, url: string): UrlTree {
  return router.createUrlTree([LOGIN_PATH], { queryParams: { volver: url } });
}

/** Deja pasar a quien tiene sesión; al visitante lo lleva a ingresar. */
export const sessionGuard: CanActivateFn = async (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  await session.load();
  return session.isLoggedIn() ? true : toLogin(router, state.url);
};

/**
 * Deja pasar a quien tiene ese rol o uno mayor. Al visitante lo lleva a ingresar;
 * a quien tiene sesión pero no alcanza, al inicio con el aviso de que no hay
 * permiso. La API vuelve a decidir en cada petición: esto solo evita mostrar
 * pantallas que no se pueden usar.
 */
export function roleGuard(minimum: Role): CanActivateFn {
  return async (_route, state) => {
    const session = inject(SessionService);
    const router = inject(Router);
    const notices = inject(NoticeService);

    await session.load();
    if (!session.isLoggedIn()) return toLogin(router, state.url);
    if (session.hasRole(minimum)) return true;

    notices.show('error', [NO_PERMISSION]);
    return router.createUrlTree(['/']);
  };
}

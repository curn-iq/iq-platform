import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map } from 'rxjs';
import type { Role } from '../../domain/role';
import { NO_PERMISSION } from '../http/error-message';
import { NoticeService } from '../notice/notice.service';
import { LOGIN_PATH } from './login-path';
import { ReturnNavigation } from './return-navigation';
import { SessionService } from './session.service';

/** A ingresar, con la ruta a la que se iba en `?volver=`. */
function toLogin(router: Router, url: string): UrlTree {
  return router.createUrlTree([LOGIN_PATH], { queryParams: { volver: url } });
}

/**
 * Deja pasar a quien tiene sesión; al visitante lo lleva a ingresar. Si la API no responde y no
 * se sabe si hay sesión (sin conexión, un 5xx, un tiempo agotado), **no** lo manda a ingresar:
 * la navegación espera con su URL, la aplicación dice que no pudo comprobar la sesión y vuelve a
 * preguntar (`SessionService.verified()`); al responder, sigue a la ruta pedida. Hasta
 * entonces no se abre la pantalla ni se muestra nada privado.
 */
export const sessionGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  return session
    .verified()
    .pipe(map(() => (session.isLoggedIn() ? true : toLogin(router, state.url))));
};

/**
 * Deja pasar a quien tiene ese rol o uno mayor. Al visitante lo lleva a ingresar; a quien
 * tiene sesión pero no alcanza, al inicio con el aviso de que no hay permiso. Si no se sabe si
 * hay sesión, espera como `sessionGuard`. La API vuelve a decidir en cada petición: esto solo
 * evita mostrar pantallas que no se pueden usar, y el rol que guarda el navegador nunca da un
 * permiso por sí solo.
 */
export function roleGuard(minimum: Role): CanActivateFn {
  return (_route, state) => {
    const session = inject(SessionService);
    const router = inject(Router);
    const notices = inject(NoticeService);

    return session.verified().pipe(
      map(() => {
        if (!session.isLoggedIn()) return toLogin(router, state.url);
        if (session.hasRole(minimum)) return true;

        notices.show('error', [NO_PERMISSION]);
        return router.createUrlTree(['/']);
      }),
    );
  };
}

/**
 * Para ingresar y crear la cuenta: a quien ya se sabe que tiene sesión lo lleva a donde iba
 * (`?volver=`, también a SIMIQ3D o SIVRI, con navegación completa: `ReturnNavigation`) o al
 * catálogo, **sin ningún aviso** (decirle a una URL que ya hay una sesión sería
 * dar información de más); quien quiera crear otra cuenta cierra antes la sesión desde «Mi cuenta».
 * **No espera** a `GET /auth/me`: el formulario es lo que necesita quien no tiene sesión y no se
 * deja en blanco por un servidor que tarda. Si la respuesta llega después y sí hay sesión, la
 * pantalla hace lo mismo que este guard (`AccountEntry`).
 */
export const guestGuard: CanActivateFn = (route) =>
  inject(SessionService).isLoggedIn()
    ? inject(ReturnNavigation).resolve(route.queryParamMap.get('volver'))
    : true;

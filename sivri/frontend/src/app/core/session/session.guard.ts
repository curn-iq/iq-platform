import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { SessionService } from './session.service';
import { ShellNavigation } from './shell';

/**
 * Para las rutas de SIVRI que piden cuenta (la cámara). Espera a saber si hay sesión (ver
 * `SessionService.known`); sin sesión, lleva al ingreso del shell con `?volver=`
 * a la ruta pedida.
 */
export const sessionGuard: CanActivateFn = async (_route, state) => {
  const session = inject(SessionService);
  const shell = inject(ShellNavigation);
  if ((await session.known()) === 'authenticated') return true;
  shell.goToLogin(state.url);
  return false;
};

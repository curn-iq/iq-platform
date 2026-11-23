import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DESKTOP_QUERY } from '../../shared/media-query';

/**
 * En el computador SIVRI solo explica y lleva al celular: la cámara del computador no ve la mesa
 * desde arriba. Quien llegue a la cámara desde un computador (con la dirección escrita, por
 * ejemplo) vuelve a la entrada, que le dice cómo usarla desde el celular.
 */
export const notDesktopGuard: CanActivateFn = () => {
  const desktop = typeof matchMedia === 'function' && matchMedia(DESKTOP_QUERY).matches;
  return desktop ? inject(Router).parseUrl('/') : true;
};

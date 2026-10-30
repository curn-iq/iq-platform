import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { SessionService } from './session.service';

/**
 * Pide la cuenta al arrancar. No espera la respuesta: el backend puede tardar
 * segundos en arrancar en frío y las páginas públicas no deben quedar en blanco.
 * Los guards sí la esperan (`SessionService.load()`).
 */
export function provideSession(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      void inject(SessionService).load();
    }),
  ]);
}

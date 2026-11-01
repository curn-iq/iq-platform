import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SessionService } from './session.service';

/**
 * Pide la cuenta al arrancar. No espera la respuesta: el backend puede tardar
 * segundos en arrancar en frío y las páginas públicas no deben quedar en blanco.
 * Los guards sí la esperan (`SessionService.load()`). Si la API no respondió, se
 * vuelve a preguntar al cambiar de página, también en las públicas, que no tienen
 * guard; si ya respondió, `load()` no pide nada.
 */
export function provideSession(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      const session = inject(SessionService);
      void session.load();
      inject(Router)
        .events.pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => void session.load());
    }),
  ]);
}

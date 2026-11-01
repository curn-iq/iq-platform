import { ViewportScroller } from '@angular/common';
import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter, Routes, withInMemoryScrolling } from '@angular/router';

/** Lo que tapa la barra fija: su alto real, que cambia en celular. */
export function navbarOffset(): [number, number] {
  const navbar = document.querySelector('app-navbar');
  return [0, navbar?.getBoundingClientRect().height ?? 0];
}

/**
 * El router de la app. Los enlaces de la barra y del pie llevan a secciones del
 * inicio (`/#camino`, `/#investigacion`, `/#preguntas`, `/#quien`), así que con
 * `anchorScrolling` el router baja hasta la sección del fragmento. Tocar de nuevo
 * el mismo enlace, ya en esa dirección pero más abajo en la página, también
 * vuelve a bajar: el router lo hace aun cuando ignora la navegación a la misma URL.
 *
 * El router calcula la posición por su cuenta y no mira el `scroll-margin-top` de la
 * sección, que solo vale para el desplazamiento del navegador. Para que no quede bajo
 * la barra fija, se le da el alto de la barra con `setOffset`.
 */
export function provideAppRouter(routes: Routes): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideAppInitializer(() => inject(ViewportScroller).setOffset(navbarOffset)),
  ]);
}

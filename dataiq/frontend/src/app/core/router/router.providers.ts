import { EnvironmentProviders } from '@angular/core';
import { provideRouter, Routes, withInMemoryScrolling } from '@angular/router';

/**
 * El router de la app. Los enlaces de la barra y del pie llevan a secciones del
 * inicio (`/#camino`, `/#investigacion`, `/#preguntas`, `/#quien`), así que con
 * `anchorScrolling` el router baja hasta la sección del fragmento (cada sección
 * lleva su `scroll-margin-top` para no quedar bajo la barra fija). Tocar de nuevo
 * el mismo enlace, ya en esa dirección pero más abajo en la página, también
 * vuelve a bajar: el router lo hace aun cuando ignora la navegación a la misma URL.
 */
export function provideAppRouter(routes: Routes): EnvironmentProviders {
  return provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' }));
}

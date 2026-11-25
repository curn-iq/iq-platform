import { DestroyRef, inject, signal, type Signal } from '@angular/core';

/**
 * Una señal que dice si la ventana cumple una media query, y se actualiza sola
 * cuando deja de cumplirla o vuelve a cumplirla. Se llama en un contexto de
 * inyección (el campo de un componente). Sin `matchMedia` (jsdom) es `false`.
 * Es la misma del frontend de DataIQ.
 */
export function mediaQuery(query: string): Signal<boolean> {
  const list = typeof matchMedia === 'function' ? matchMedia(query) : null;
  const matches = signal(list?.matches ?? false);
  if (list) {
    const onChange = (event: MediaQueryListEvent) => matches.set(event.matches);
    list.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => list.removeEventListener('change', onChange));
  }
  return matches.asReadonly();
}

/**
 * Celular: el punto de corte de 820 px de SIMIQ3D («SIMIQ3D: explorar en 3D» en `design/README.md`).
 * Un celular acostado (520 px de alto o menos) usa el diseño de escritorio, porque el panel
 * inferior le dejaría casi sin espacio a la mesa.
 */
export const MOBILE_QUERY = '(width <= 820px) and (height > 520px)';

/** Pantalla baja (un celular acostado): la cabeza y los controles se achican. */
export const SHORT_QUERY = '(height <= 520px)';

/**
 * Escritorio compacto (más de 820 y menos de 1200 px): el chat más angosto y la leyenda
 * plegada, para que la mesa conserve su espacio. Sin `matchMedia` (jsdom) no aplica, como el resto.
 */
export const COMPACT_QUERY = '(820px < width < 1200px), (width <= 820px) and (height <= 520px)';

/** Con `prefers-reduced-motion`, la cámara salta en vez de viajar. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

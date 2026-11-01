import { DestroyRef, inject, signal, type Signal } from '@angular/core';

/**
 * Una señal que dice si la ventana cumple una media query, y se actualiza sola
 * cuando deja de cumplirla o vuelve a cumplirla. Se llama en un contexto de
 * inyección (el campo de un componente). Sin `matchMedia` (jsdom) es `false`.
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

/** Celular: el punto de corte de 760 px de «Layout» en `DESIGN.md`. */
export const MOBILE_QUERY = '(max-width: 760px)';

/** Con `prefers-reduced-motion`, nada corre solo. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

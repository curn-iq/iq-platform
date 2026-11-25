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

/** Con `prefers-reduced-motion`, nada viaja ni se anima. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Un computador (con puntero fino y que pasa el puntero por encima): SIVRI solo explica y lleva
 * al celular, sin abrir la cámara (`design/README.md`, «SIVRI: celular y computador (mockups)»).
 */
export const DESKTOP_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * La pestaña a la que lleva una tecla desde la de `index`: Derecha e Izquierda dan
 * la vuelta, Inicio y Fin van a los extremos. Con cualquier otra tecla, `null`.
 */
export function tabIndexAfterKey(index: number, key: string, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index + count - 1) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/**
 * Lo mismo para una tecla pulsada, que solo cuenta si va sola: con un modificador es
 * un atajo de otra cosa (Alt+Izquierda es Atrás en el navegador) y no se le quita.
 */
export function tabIndexAfterEvent(
  index: number,
  event: KeyboardEvent,
  count: number,
): number | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  return tabIndexAfterKey(index, event.key, count);
}

/** Cuánto hay que arrastrar (en píxeles) para que cuente como cambiar de foto y no como un toque. */
export const SWIPE_THRESHOLD_PX = 80;

/** La posición `index` dentro de una lista de `count` fotos, dando la vuelta por los dos extremos. */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

/**
 * Qué foto sigue después de arrastrar `deltaX` píxeles (la diferencia entre donde se soltó y donde se
 * agarró): hacia la izquierda trae la siguiente (`1`), hacia la derecha trae la anterior (`-1`), y un
 * arrastre menor que `threshold` no cambia nada (`0`).
 */
export function swipeStep(deltaX: number, threshold: number = SWIPE_THRESHOLD_PX): -1 | 0 | 1 {
  if (Math.abs(deltaX) < threshold) return 0;
  return deltaX < 0 ? 1 : -1;
}

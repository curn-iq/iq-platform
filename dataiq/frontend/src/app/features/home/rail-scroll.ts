/** Cuántas herramientas recorre el carril de «Tres formas de recorrer una técnica». */
export const RAIL_STEPS = 3;

/**
 * Cuánto del recorrido va, de 0 a 1: la sección es más alta que la ventana y su
 * contenido queda fijo; `top` es lo que la sección lleva subido sobre el borde
 * de arriba (negativo cuando ya subió) y `total` lo que hay que recorrer (su
 * alto menos el de la ventana).
 */
export function railProgress(top: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, -top / total));
}

/** Lo que se llena el trazo de la herramienta `index`: cada una ocupa un tercio del recorrido. */
export function stepFill(progress: number, index: number): number {
  return Math.min(1, Math.max(0, progress * RAIL_STEPS - index));
}

/** La herramienta en que va el recorrido. */
export function currentStep(progress: number): number {
  return Math.min(RAIL_STEPS - 1, Math.floor(progress * RAIL_STEPS));
}

/** Lo que el carril se traslada a la izquierda: `excess` es lo que sobresale de la ventana. */
export function railOffset(progress: number, excess: number): number {
  return progress * Math.max(0, excess);
}

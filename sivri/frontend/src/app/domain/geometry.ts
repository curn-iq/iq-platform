import type { Box, Marker } from '../data/api/models';
import { boardAxes } from './markers';

/**
 * Del cuadro que se mandó al dibujo. Todo lo que trae el resultado viene en fracciones del
 * cuadro (0 a 1); el cuadro se muestra recortado a lo que cabe (`object-fit: cover`), así que
 * pasar de fracciones a píxeles tiene que contar el recorte.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Dónde queda el cuadro entero dentro del contenedor (puede salirse por los lados). */
export type CoverLayout = Rect;

/**
 * El cuadro con `object-fit: cover` en el contenedor: se agranda hasta cubrirlo y se centra,
 * así que sobra por un par de lados (`left` o `top` negativos).
 */
export function coverLayout(frame: Size, container: Size): CoverLayout {
  const scale = Math.max(container.width / frame.width, container.height / frame.height);
  const width = frame.width * scale;
  const height = frame.height * scale;
  return {
    left: (container.width - width) / 2,
    top: (container.height - height) / 2,
    width,
    height,
  };
}

/** Una caja en fracciones del cuadro, en píxeles del contenedor. */
export function boxToRect(box: Box, layout: CoverLayout): Rect {
  return {
    left: layout.left + box.x1 * layout.width,
    top: layout.top + box.y1 * layout.height,
    width: (box.x2 - box.x1) * layout.width,
    height: (box.y2 - box.y1) * layout.height,
  };
}

/** Un punto en fracciones del cuadro, en píxeles del contenedor. */
export function pointToPixels(
  point: { x: number; y: number },
  layout: CoverLayout,
): { x: number; y: number } {
  return { x: layout.left + point.x * layout.width, y: layout.top + point.y * layout.height };
}

/** ¿Queda algo de la caja dentro del contenedor? Lo que cae del todo en el recorte no se dibuja. */
export function isVisible(rect: Rect, container: Size): boolean {
  return (
    rect.left + rect.width > 0 &&
    rect.top + rect.height > 0 &&
    rect.left < container.width &&
    rect.top < container.height
  );
}

/**
 * Hacia dónde apunta la flecha de una pieza por mover, como vector unitario en el cuadro.
 * `move` dice cuántas celdas hacia abajo (`rows`) y hacia la derecha (`columns`) de la mesa;
 * con los marcadores se giran a como se ve la mesa en el cuadro. Sin movimiento, `null`. No
 * se sabe cuánto mide una celda en el cuadro, así que la flecha da la dirección, no la
 * distancia: el destino exacto no lo da el backend. El vector sale en píxeles del cuadro
 * (`frame`, su tamaño), que es como se dibuja.
 */
export function moveDirection(
  move: { rows: number; columns: number } | null,
  markers: readonly Marker[] = [],
  frame?: Size,
): { x: number; y: number } | null {
  if (!move || (move.rows === 0 && move.columns === 0)) return null;
  const axes = boardAxes(markers, frame) ?? { columns: { x: 1, y: 0 }, rows: { x: 0, y: 1 } };
  const x = move.columns * axes.columns.x + move.rows * axes.rows.x;
  const y = move.columns * axes.columns.y + move.rows * axes.rows.y;
  const length = Math.hypot(x, y);
  return length === 0 ? null : { x: x / length, y: y / length };
}

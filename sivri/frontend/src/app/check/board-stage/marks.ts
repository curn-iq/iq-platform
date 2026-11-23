import type { Box } from '../../data/api/models';

/**
 * Lo que se dibuja sobre el cuadro, en fracciones del cuadro (0 a 1): el escenario lo pasa a
 * píxeles contando el recorte de `object-fit: cover`.
 */
export type Mark =
  /** Mientras arma: el nombre de lo que se ve, sin caja ni color. */
  | { readonly kind: 'name'; readonly label: string; readonly box: Box }
  /** El marcador que falta, en el lugar donde debería verse (punteado). */
  | { readonly kind: 'missing-marker'; readonly x: number; readonly y: number }
  /** Una pieza que hay que corregir: su caja y su etiqueta en `alerta-noche`. */
  | { readonly kind: 'piece'; readonly label: string; readonly box: Box }
  /** Hacia dónde va una pieza por mover: una flecha punteada desde su caja, con «VA AQUÍ». */
  | {
      readonly kind: 'arrow';
      readonly box: Box;
      readonly direction: { readonly x: number; readonly y: number };
    };

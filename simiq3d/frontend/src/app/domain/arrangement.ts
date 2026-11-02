import { MAYO_TABLE_SIZE, TablePoint } from './mayo-table';

/**
 * El lugar que ocupa una pieza sobre la mesa, visto desde arriba: el centro de
 * su rectángulo y su medio largo (X) y medio ancho (Z), en metros.
 */
export interface Footprint {
  x: number;
  z: number;
  halfLength: number;
  halfWidth: number;
}

/** Cuánto se separan dos piezas que se corren para no taparse. */
export const PIECE_GAP = 0.003;
/** Lo que queda libre entre una pieza y el borde de la mesa. */
export const EDGE_MARGIN = 0.01;
const MAX_ROUNDS = 100;

/**
 * Dónde va cada pieza en la escena. Parte del centro de sus celdas (la regla de
 * `simiq3d/README.md`, «Cómo se arma la mesa en 3D») y solo se corre lo justo
 * para que quede dentro de la mesa y no tape a otra (decidido por Mauricio el
 * 2026-11-01): en una mesa real ninguna pieza cuelga del borde y, aunque estén
 * juntas, se distingue cuál es cuál.
 *
 * Dos piezas que se tapan se separan por el lado en que menos se tapan; como las
 * piezas son largas y delgadas y todas apuntan igual, casi siempre es a lo ancho,
 * así que cada una sigue en su fila y en el mismo orden.
 */
export function arrange(pieces: readonly Footprint[]): TablePoint[] {
  const points = pieces.map((piece) => clampInside(piece, { x: piece.x, z: piece.z }));
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let moved = false;
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = points[i];
        const b = points[j];
        const overlapX =
          pieces[i].halfLength + pieces[j].halfLength + PIECE_GAP - Math.abs(a.x - b.x);
        const overlapZ =
          pieces[i].halfWidth + pieces[j].halfWidth + PIECE_GAP - Math.abs(a.z - b.z);
        if (overlapX <= 1e-9 || overlapZ <= 1e-9) continue;
        if (overlapZ <= overlapX) {
          // Si están a la misma altura, la de antes en la leyenda va al fondo
          const away = Math.sign(b.z - a.z) || 1;
          a.z -= (away * overlapZ) / 2;
          b.z += (away * overlapZ) / 2;
        } else {
          const away = Math.sign(b.x - a.x) || 1;
          a.x -= (away * overlapX) / 2;
          b.x += (away * overlapX) / 2;
        }
        points[i] = clampInside(pieces[i], a);
        points[j] = clampInside(pieces[j], b);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return points;
}

/** El centro más cercano con la pieza entera dentro de la mesa. */
function clampInside(piece: Footprint, point: TablePoint): TablePoint {
  return {
    x: clamp(point.x, MAYO_TABLE_SIZE.width / 2 - EDGE_MARGIN - piece.halfLength),
    z: clamp(point.z, MAYO_TABLE_SIZE.depth / 2 - EDGE_MARGIN - piece.halfWidth),
  };
}

/** Entre −limit y +limit; si la pieza no cabe, al centro. */
function clamp(value: number, limit: number): number {
  return limit <= 0 ? 0 : Math.min(limit, Math.max(-limit, value));
}

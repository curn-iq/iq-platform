import type { Marker } from '../data/api/models';

/**
 * Los cuatro marcadores ArUco de las esquinas de la mesa (`DICT_4X4_50`, ids 0 a 3), en el
 * orden de las esquinas: arriba a la izquierda, arriba a la derecha, abajo a la derecha y
 * abajo a la izquierda (`sivri/backend/app/domain/board.py`).
 */
export const MARKER_IDS = [0, 1, 2, 3] as const;
export type MarkerId = (typeof MARKER_IDS)[number];

const CORNER_NAMES: Record<MarkerId, string> = {
  0: 'arriba a la izquierda',
  1: 'arriba a la derecha',
  2: 'abajo a la derecha',
  3: 'abajo a la izquierda',
};

export interface MarkerStatus {
  /** Cuántos de los cuatro se ven (cada id cuenta una vez). */
  readonly seen: number;
  /** Los que no se ven, en el orden de las esquinas. */
  readonly missing: readonly MarkerId[];
  /** Están los cuatro: es lo que habilita «Ya armé la mesa». */
  readonly complete: boolean;
  /** Qué falta, dicho al estudiante («Falta el de abajo a la derecha.»); `null` si están los cuatro. */
  readonly phrase: string | null;
  /** Qué revisar, dicho al estudiante; `null` si están los cuatro. */
  readonly hint: string | null;
}

function isMarkerId(id: number): id is MarkerId {
  return (MARKER_IDS as readonly number[]).includes(id);
}

/** Une «el de X», «el de Y» y «el de Z» como en español: «A, B y C». */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

/** Qué marcadores se ven y qué se le dice al estudiante de los que faltan. */
export function markerStatus(markers: readonly Pick<Marker, 'id'>[]): MarkerStatus {
  const present = new Set(markers.map((m) => m.id).filter(isMarkerId));
  const missing = MARKER_IDS.filter((id) => !present.has(id));
  const seen = MARKER_IDS.length - missing.length;
  if (missing.length === 0) {
    return { seen, missing, complete: true, phrase: null, hint: null };
  }
  if (seen === 0) {
    return {
      seen,
      missing,
      complete: false,
      phrase: 'No se ve ninguno de los cuatro marcadores.',
      hint: 'Sostén el celular sobre la mesa, con las cuatro esquinas a la vista.',
    };
  }
  const named = missing.map((id) => `el de ${CORNER_NAMES[id]}`);
  const one = missing.length === 1;
  return {
    seen,
    missing,
    complete: false,
    phrase: `${one ? 'Falta' : 'Faltan'} ${joinList(named)}.`,
    hint: `Revisa que no ${one ? 'lo tape' : 'los tape'} la mano ni el instrumental.`,
  };
}

/**
 * Dónde dibujar el marcador que falta, cuando se ven los otros tres (fracciones del cuadro):
 * la esquina opuesta del paralelogramo que forman. Con otra cantidad no se puede saber.
 */
export function estimateMissingMarker(
  markers: readonly Marker[],
): { id: MarkerId; x: number; y: number } | null {
  const status = markerStatus(markers);
  if (status.seen !== 3) return null;
  const [id] = status.missing;
  const at = (corner: MarkerId) => markers.find((m) => m.id === corner)!;
  // Cada esquina es la suma de sus dos vecinas menos la opuesta
  const neighbours: Record<MarkerId, [MarkerId, MarkerId, MarkerId]> = {
    0: [1, 3, 2],
    1: [0, 2, 3],
    2: [1, 3, 0],
    3: [0, 2, 1],
  };
  const [a, b, opposite] = neighbours[id];
  return {
    id,
    x: at(a).x + at(b).x - at(opposite).x,
    y: at(a).y + at(b).y - at(opposite).y,
  };
}

/**
 * Hacia dónde apunta cada eje de la mesa en el cuadro, como vectores unitarios: `columns`
 * (hacia la derecha de la mesa) y `rows` (hacia abajo de la mesa). Con la cámara paralela a
 * la mesa son (1, 0) y (0, 1); si el celular está girado, se giran con él. `null` si no se
 * ven los cuatro marcadores.
 *
 * Los marcadores vienen en fracciones del cuadro, y en un cuadro que no es cuadrado una fracción
 * de ancho no mide lo mismo que una de alto: antes de normalizar se pasan a píxeles con el
 * tamaño del cuadro (`frame`), o la dirección sale torcida cuando la mesa está girada.
 */
export function boardAxes(
  markers: readonly Marker[],
  frame: { width: number; height: number } = { width: 1, height: 1 },
): { columns: { x: number; y: number }; rows: { x: number; y: number } } | null {
  const by = new Map(markers.map((m) => [m.id, m]));
  const [m0, m1, m2, m3] = MARKER_IDS.map((id) => by.get(id));
  if (!m0 || !m1 || !m2 || !m3) return null;
  const unit = (dx: number, dy: number) => {
    const x = dx * frame.width;
    const y = dy * frame.height;
    const length = Math.hypot(x, y);
    return length === 0 ? null : { x: x / length, y: y / length };
  };
  const columns = unit(m1.x - m0.x + (m2.x - m3.x), m1.y - m0.y + (m2.y - m3.y));
  const rows = unit(m3.x - m0.x + (m2.x - m1.x), m3.y - m0.y + (m2.y - m1.y));
  return columns && rows ? { columns, rows } : null;
}

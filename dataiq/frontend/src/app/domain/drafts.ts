import { versionProgress, type ProgressSource, type VersionProgress } from './version-progress';
import type { VersionState } from './version-state';

/** Lo que dice la pastilla de estado de una fila de Mis borradores. */
export type DraftStatus = 'returned' | 'draft' | 'in_review';

/** Los filtros de Mis borradores: todas y cada estado. */
export type DraftFilter = 'all' | DraftStatus;

/**
 * Una versión con su contenido y sus devoluciones, con los nombres de la API (es lo que
 * entrega `GET /versions/{id}`). El dominio no importa los tipos de la API: la estructura
 * basta, y esos tipos la cumplen.
 */
export interface DraftSource {
  summary: {
    id: string;
    technique: string;
    specialty: string;
    number: number;
    state: VersionState;
    updated_at: string;
  };
  content: ProgressSource;
  /** De la más reciente a la más vieja, como las entrega la API. */
  rejections: readonly { reason: string; rejected_by: string; created_at: string }[];
}

/** El motivo con el que un revisor devolvió una versión. */
export interface ReturnNote {
  /** Un comentario por línea (Resuelto 18): hay que respetar sus saltos de línea. */
  reason: string;
  date: Date;
  /** Quién la devolvió. */
  by: string;
}

/** Una fila de la matriz de Mis borradores. */
export interface DraftRow {
  id: string;
  technique: string;
  specialty: string;
  number: number;
  status: DraftStatus;
  updatedAt: Date;
  progress: VersionProgress;
  /** Solo en una devuelta: la devolución más reciente. */
  note: ReturnNote | null;
}

/**
 * El estado de una versión en curso: un borrador con devoluciones es «Devuelta», uno sin ellas es
 * «Borrador» y una versión en revisión es «En revisión», aunque antes se haya devuelto. Una versión
 * que no está en curso no tiene estado de borrador (`null`).
 */
export function draftStatus(
  state: VersionState,
  rejections: readonly unknown[],
): DraftStatus | null {
  if (state === 'in_review') return 'in_review';
  if (state !== 'draft') return null;
  return rejections.length > 0 ? 'returned' : 'draft';
}

/**
 * Las filas de Mis borradores, en el orden en que llegan. Solo lo que está en curso
 * (borrador o en revisión) tiene fila. Un borrador con devoluciones es «Devuelta»; una
 * versión en revisión que antes se devolvió ya es «En revisión», sin nota.
 */
export function toDraftRows(sources: readonly DraftSource[]): DraftRow[] {
  return sources.flatMap(({ summary, content, rejections }): DraftRow[] => {
    const status = draftStatus(summary.state, rejections);
    if (status === null) return [];
    const latest = status === 'returned' ? rejections[0] : undefined;
    return [
      {
        id: summary.id,
        technique: summary.technique,
        specialty: summary.specialty,
        number: summary.number,
        status,
        updatedAt: new Date(summary.updated_at),
        progress: versionProgress(content),
        note: latest
          ? { reason: latest.reason, date: new Date(latest.created_at), by: latest.rejected_by }
          : null,
      },
    ];
  });
}

/** Las filas del filtro elegido, en su orden. */
export function filterDrafts(rows: readonly DraftRow[], filter: DraftFilter): DraftRow[] {
  return filter === 'all' ? [...rows] : rows.filter((row) => row.status === filter);
}

/** Cuántas filas tiene cada filtro. «Borradores» no incluye las devueltas. */
export function countDrafts(rows: readonly DraftRow[]): Record<DraftFilter, number> {
  const count = (status: DraftStatus) => rows.filter((row) => row.status === status).length;
  return {
    all: rows.length,
    returned: count('returned'),
    draft: count('draft'),
    in_review: count('in_review'),
  };
}

/**
 * La línea bajo el título de Mis borradores. Quien publica lo suyo (revisor o admin) no
 * tiene versiones devueltas ni en revisión: su línea dice que se publica sin revisión.
 * Los textos los decidió Juan el 2026-11-01 (Resuelto 47 de `dataiq/docs/checklist-frontend.md`).
 */
export function draftsSummary(rows: readonly DraftRow[], publishesOwn: boolean): string {
  const total = rows.length;
  if (total === 0) return 'Nada en curso.';
  const inProgress = total === 1 ? '1 técnica en curso.' : `${total} técnicas en curso.`;
  if (publishesOwn) {
    return total === 1
      ? `${inProgress} Se publica al terminarla, sin pasar por revisión.`
      : `${inProgress} Se publican al terminarlas, sin pasar por revisión.`;
  }
  const returned = countDrafts(rows).returned;
  if (returned === 0) return inProgress;
  return returned === 1
    ? `${inProgress} Una volvió de revisión.`
    : `${inProgress} ${returned} volvieron de revisión.`;
}

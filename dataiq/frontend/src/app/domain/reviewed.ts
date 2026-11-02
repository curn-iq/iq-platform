import { formatDay } from './edited-date';
import type { VersionState } from './version-state';

/**
 * Una versión con sus devoluciones, con los nombres de la API (es lo que entrega
 * `GET /versions?include=content`). El dominio no importa los tipos de la API: la estructura
 * basta, y esos tipos la cumplen.
 */
export interface ReviewedSource {
  summary: {
    id: string;
    technique: string;
    specialty: string;
    number: number;
    state: VersionState;
    author: string;
  };
  /** De la más reciente a la más vieja, como las entrega la API. */
  rejections: readonly { reason: string; rejected_by: string; created_at: string }[];
}

/** Qué decidió la revisión. */
export type ReviewResult = 'returned' | 'approved';

/** Una fila de «Revisadas por mí». */
export interface ReviewedRow {
  id: string;
  technique: string;
  specialty: string;
  number: number;
  author: string;
  result: ReviewResult;
  /** Cuándo se devolvió. La API no guarda cuándo se aprobó: una aprobada no tiene fecha. */
  reviewedAt: Date | null;
  /** El motivo de la devolución, un comentario por línea (Resuelto 18). Una aprobada no tiene. */
  reason: string | null;
}

/**
 * Las filas de «Revisadas por mí» (Resuelto 58 de `dataiq/docs/checklist-frontend.md`), en el
 * orden en que llegan. La API no guarda el resultado de una revisión: se deduce del estado de la
 * versión. Un borrador con devoluciones es «Devuelta», con la fecha y el motivo de la más
 * reciente; una versión publicada, reemplazada o archivada es «Aprobada». Una versión que volvió
 * a revisión espera otra decisión y está en «Por revisar», y un borrador sin devoluciones no
 * pasó por una revisión: ninguna de las dos tiene fila.
 *
 * Límite conocido: si la devolví yo y otro revisor aprobó después la versión que volvió, sale
 * «Aprobada», porque la API no dice quién aprobó cada una.
 */
export function toReviewedRows(sources: readonly ReviewedSource[]): ReviewedRow[] {
  return sources.flatMap(({ summary, rejections }): ReviewedRow[] => {
    const base = {
      id: summary.id,
      technique: summary.technique,
      specialty: summary.specialty,
      number: summary.number,
      author: summary.author,
    };
    if (
      summary.state === 'published' ||
      summary.state === 'superseded' ||
      summary.state === 'archived'
    ) {
      return [{ ...base, result: 'approved', reviewedAt: null, reason: null }];
    }
    const latest = rejections[0];
    if (summary.state === 'draft' && latest) {
      return [
        {
          ...base,
          result: 'returned',
          reviewedAt: new Date(latest.created_at),
          reason: latest.reason,
        },
      ];
    }
    return [];
  });
}

/** La columna «Revisada»: el día de la devolución, o «—» si no se sabe (una aprobada). */
export function formatReviewed(reviewedAt: Date | null, now: Date): string {
  return reviewedAt === null ? '—' : formatDay(reviewedAt, now);
}

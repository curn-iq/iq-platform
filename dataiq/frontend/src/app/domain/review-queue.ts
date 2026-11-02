import { formatDay } from './edited-date';
import type { VersionState } from './version-state';

/**
 * Una versión tal como la entrega `GET /versions`, con los nombres de la API. El dominio no importa
 * los tipos de la API: la estructura basta, y esos tipos la cumplen.
 */
export interface QueueSource {
  id: string;
  technique: string;
  specialty: string;
  number: number;
  state: VersionState;
  created_by: string;
  author: string;
  updated_at: string;
}

/** Qué se revisa: una técnica que aún no se publicó o una edición de la que sí. */
export type QueueKind = 'new_technique' | 'edit';

/** Una fila de «Por revisar». */
export interface QueueRow {
  id: string;
  technique: string;
  specialty: string;
  number: number;
  author: string;
  /**
   * Cuándo llegó a revisión. La API no guarda la fecha del envío aparte: una versión en revisión
   * no se edita, así que su última modificación es el envío.
   */
  sentAt: Date;
  kind: QueueKind;
}

/**
 * Las filas de «Por revisar» (Fase 7 de `dataiq/docs/checklist-frontend.md`): las versiones en
 * revisión de otras personas, la que lleva más esperando primero (como el mockup). Las propias no
 * están: un revisor o un admin publica lo suyo desde el editor, sin pasar por otro revisor.
 * `GET /versions` le entrega al revisor todas las versiones en revisión, también las suyas.
 */
export function toQueueRows(sources: readonly QueueSource[], ownerId: string): QueueRow[] {
  return sources
    .filter((source) => source.state === 'in_review' && source.created_by !== ownerId)
    .map((source): QueueRow => ({
      id: source.id,
      technique: source.technique,
      specialty: source.specialty,
      number: source.number,
      author: source.author,
      sentAt: new Date(source.updated_at),
      // La versión 1 es la primera de una técnica: no hay publicada con la que comparar.
      kind: source.number === 1 ? 'new_technique' : 'edit',
    }))
    .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
}

/** Los días de calendario entre `sent` y `now` (hora local), nunca negativos. */
export function waitedDays(sent: Date, now: Date): number {
  const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(0, Math.round((day(now) - day(sent)) / 86_400_000));
}

function dayCount(days: number): string {
  return days === 1 ? '1 día' : `${days} días`;
}

/**
 * La columna «Enviada»: la fecha y cuánto lleva esperando, «1 oct · hace 5 días», con «hoy» y
 * «ayer» cuando corresponde. Los textos los decidió Juan el 2026-11-02 (Fase 7 de
 * `dataiq/docs/checklist-frontend.md`).
 */
export function formatSent(sent: Date, now: Date): string {
  const days = waitedDays(sent, now);
  const wait = days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;
  return `${formatDay(sent, now)} · ${wait}`;
}

/**
 * La línea bajo el título de «Por revisar»: cuántas esperan y cuánto lleva la más antigua. En voz
 * impersonal (`PRODUCT.md`), no como el mockup («esperan tu revisión»).
 */
export function queueSummary(rows: readonly QueueRow[], now: Date): string {
  if (rows.length === 0) return 'Nada por revisar.';
  const oldest = Math.min(...rows.map((row) => row.sentAt.getTime()));
  const days = waitedDays(new Date(oldest), now);
  if (rows.length === 1) {
    return days === 0
      ? '1 versión espera revisión. Llegó hoy.'
      : `1 versión espera revisión. Lleva ${dayCount(days)}.`;
  }
  return days === 0
    ? `${rows.length} versiones esperan revisión. La más antigua llegó hoy.`
    : `${rows.length} versiones esperan revisión. La más antigua lleva ${dayCount(days)}.`;
}

import type { EditorSuture } from './editor-content';

/** Una fila nueva de «Suturas por plano»: vacía, para escribir. */
export function emptySutureRow(): EditorSuture {
  return { plane: '', name: '', gauge: '', needle_type: '' };
}

/** Los datos que se escriben en una fila. */
export type SutureRowField = keyof EditorSuture;

/** Una fila con ese campo cambiado. No cambia la que recibe. */
export function withSutureField(
  row: EditorSuture,
  field: SutureRowField,
  value: string,
): EditorSuture {
  return { ...row, [field]: value };
}

function filled(value: string): boolean {
  return value.trim() !== '';
}

/** Si la fila tiene el nombre de la sutura: sin él no se guarda ni cuenta como sutura. */
export function hasSutureName(row: Pick<EditorSuture, 'name'>): boolean {
  return filled(row.name);
}

/**
 * Si a la fila le falta la sutura habiendo escrito otra cosa (plano, calibre o aguja): se avisa para
 * que no se pierda sin notarlo. Una fila del todo vacía (recién agregada) no avisa nada.
 */
export function sutureRowNeedsName(row: EditorSuture): boolean {
  return !hasSutureName(row) && (filled(row.plane) || filled(row.gauge) || filled(row.needle_type));
}

/** Lo que dice el botón de quitar una fila, para quien no lo ve: con su plano si lo tiene. */
export function removeSutureLabel(row: Pick<EditorSuture, 'plane'>): string {
  return `Quitar ${row.plane.trim() || 'plano'}`;
}

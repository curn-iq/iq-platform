/** Lo que hace falta de una versión en curso para decidir qué ofrece el botón de editar. */
export interface InProgressVersion {
  id: string;
  state: string;
  created_by: string;
  author: string;
}

/**
 * Lo que ofrece el botón de editar del detalle de una técnica, según su versión en curso (cada técnica
 * tiene una sola) y quién pregunta (Resuelto 24 de `dataiq/docs/checklist-frontend.md`):
 * - `edit`: no hay versión en curso, «Editar técnica» crea una desde la publicada.
 * - `continue`: es un borrador de quien pregunta, «Continuar borrador».
 * - `view`: es una versión de quien pregunta en revisión, «Ver versión en revisión» (el editor la abre
 *   en solo lectura).
 * - `busy`: es de otra persona, «En curso por …», sin acción.
 */
export type EditAction =
  | { kind: 'edit'; label: string; icon: 'pencil' }
  | { kind: 'continue'; label: string; icon: 'pencil'; versionId: string }
  | { kind: 'view'; label: string; icon: 'clock'; versionId: string }
  | { kind: 'busy'; label: string; icon: 'clock' };

export const EDIT_LABEL = 'Editar técnica';

/** Qué ofrece el botón. Una versión en curso que no es un borrador ni está en revisión no cuenta. */
export function editAction(
  inProgress: InProgressVersion | undefined,
  accountId: string | undefined,
): EditAction {
  if (!inProgress) return { kind: 'edit', label: EDIT_LABEL, icon: 'pencil' };
  if (inProgress.created_by !== accountId) {
    return { kind: 'busy', label: `En curso por ${inProgress.author}`, icon: 'clock' };
  }
  if (inProgress.state === 'in_review') {
    return {
      kind: 'view',
      label: 'Ver versión en revisión',
      icon: 'clock',
      versionId: inProgress.id,
    };
  }
  if (inProgress.state === 'draft') {
    return {
      kind: 'continue',
      label: 'Continuar borrador',
      icon: 'pencil',
      versionId: inProgress.id,
    };
  }
  return { kind: 'edit', label: EDIT_LABEL, icon: 'pencil' };
}

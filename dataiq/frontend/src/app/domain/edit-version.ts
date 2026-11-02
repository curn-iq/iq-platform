import type { VersionState } from './version-state';

/**
 * Si el editor puede cambiar la versión: solo un borrador. Una en revisión se abre en solo lectura
 * (Resuelto 47 de `dataiq/docs/checklist-frontend.md`): `PUT /versions/{id}` la rechazaría.
 */
export function canEditVersion(state: VersionState): boolean {
  return state === 'draft';
}

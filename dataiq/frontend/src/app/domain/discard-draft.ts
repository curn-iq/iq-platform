import type { VersionState } from './version-state';

/**
 * Si se puede descartar la versión: solo un borrador. Una en revisión no (la API responde 409) y
 * lo publicado no se borra nunca: se archiva (Resuelto 25 de `dataiq/docs/checklist-frontend.md`).
 */
export function canDiscard(state: VersionState): boolean {
  return state === 'draft';
}

/**
 * Si descartar esta versión borra también la técnica. Es la versión 1 en borrador: una técnica
 * nueva que nunca se publicó, así que no tiene otra versión que la conserve (Resuelto 25). Una
 * versión posterior de una técnica publicada solo borra el borrador.
 */
export function discardDeletesTechnique(version: { number: number; state: VersionState }): boolean {
  return version.state === 'draft' && version.number === 1;
}

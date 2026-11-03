import { hasAtLeast, type Role } from './role';

/**
 * Dice si quien tiene ese rol ve «Archivar técnica» en «Más acciones» del detalle: un revisor o un
 * admin. Sin cuenta (`null`), no. Solo decide qué se muestra: quien permite o niega es la API
 * (`POST /techniques/{id}/archive`).
 */
export function canArchive(role: Role | null): boolean {
  return role !== null && hasAtLeast(role, 'reviewer');
}

/**
 * Dice si la técnica tiene una versión en curso (borrador o en revisión) entre las `versions`: con una
 * en curso no se puede archivar (Resuelto 21 de `dataiq/docs/checklist-frontend.md`; la API responde
 * 409). Las versiones tienen los nombres de la API.
 */
export function hasVersionInProgress(
  versions: readonly { technique_id: string }[],
  techniqueId: string,
): boolean {
  return versions.some((version) => version.technique_id === techniqueId);
}

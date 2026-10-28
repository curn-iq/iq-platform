/** Estado de una versión de técnica. */
export type VersionState = 'draft' | 'in_review' | 'published' | 'superseded' | 'archived';

/**
 * Transiciones permitidas, las mismas de `ALLOWED_TRANSITIONS` en el backend.
 * `draft → published` es el revisor o el admin publicando lo suyo sin revisión;
 * quién puede hacerlo lo decide la API.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<VersionState, readonly VersionState[]>> = {
  draft: ['in_review', 'published'],
  in_review: ['draft', 'published'],
  published: ['superseded', 'archived'],
  superseded: [],
  archived: [],
};

/** Dice si una versión puede pasar de `from` a `to`. */
export function canTransition(from: VersionState, to: VersionState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

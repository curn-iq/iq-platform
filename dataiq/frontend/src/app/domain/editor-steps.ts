/** Un paso del editor de técnicas. */
export interface EditorStep {
  /** Cómo se llama en la URL: `/gestion/editor/:versionId/<slug>`. */
  readonly slug: string;
  /** Lo que dice el paso. El último cambia según quién lo abra (ver «Editor de técnica» en `DESIGN.md`). */
  readonly label: string;
}

/**
 * Los cinco pasos del editor, en orden. Los slugs los decidió Juan el 2026-11-01 (Resuelto 47
 * de `dataiq/docs/checklist-frontend.md`).
 */
export const EDITOR_STEPS: readonly EditorStep[] = [
  { slug: 'datos-clinicos', label: 'Datos clínicos' },
  { slug: 'instrumental', label: 'Instrumental' },
  { slug: 'mesa-de-mayo', label: 'Mesa de Mayo' },
  { slug: 'mesa-de-reserva', label: 'Mesa de reserva' },
  { slug: 'revisar', label: 'Revisar y enviar' },
];

/** El paso con el que abre una versión desde Mis borradores. */
export const FIRST_EDITOR_STEP = EDITOR_STEPS[0].slug;

/** El paso de un slug de la URL, o `undefined` si no hay uno con ese nombre. */
export function findEditorStep(slug: string | null | undefined): EditorStep | undefined {
  return EDITOR_STEPS.find((step) => step.slug === slug);
}

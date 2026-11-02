import type { SectionKey } from './version-progress';

/** Una sección del contenido de una versión y el paso del editor donde se completa. */
export interface VersionSection {
  readonly key: SectionKey;
  /** El paso del editor donde se completa (`/gestion/editor/:versionId/<slug>`). */
  readonly slug: string;
  /** Cómo se llama la sección, y su paso. */
  readonly name: string;
}

/**
 * Las cuatro secciones de una versión, en orden: cada una es uno de los cuatro primeros pasos del editor
 * y una columna de Mis borradores y del resumen de «Revisar y enviar».
 */
export const VERSION_SECTIONS: readonly VersionSection[] = [
  { key: 'clinical', slug: 'datos-clinicos', name: 'Datos clínicos' },
  { key: 'instrumental', slug: 'instrumental', name: 'Instrumental' },
  { key: 'mayo', slug: 'mesa-de-mayo', name: 'Mesa de Mayo' },
  { key: 'reserve', slug: 'mesa-de-reserva', name: 'Mesa de reserva' },
];

/** Un paso del editor de técnicas. */
export interface EditorStep {
  /** Cómo se llama en la URL: `/gestion/editor/:versionId/<slug>`. */
  readonly slug: string;
  /** Lo que dice el paso. El último cambia según quién lo abra: ver `stepLabel()`. */
  readonly label: string;
}

/**
 * Los cinco pasos del editor, en orden: las cuatro secciones y el de revisar. Los slugs los decidió Juan
 * el 2026-11-01 (Resuelto 47 de `dataiq/docs/checklist-frontend.md`).
 */
export const EDITOR_STEPS: readonly EditorStep[] = [
  ...VERSION_SECTIONS.map(({ slug, name }) => ({ slug, label: name })),
  { slug: 'revisar', label: 'Revisar y enviar' },
];

/** El paso con el que abre una versión desde Mis borradores. */
export const FIRST_EDITOR_STEP = EDITOR_STEPS[0].slug;

/** El paso de un slug de la URL, o `undefined` si no hay uno con ese nombre. */
export function findEditorStep(slug: string | null | undefined): EditorStep | undefined {
  return EDITOR_STEPS.find((step) => step.slug === slug);
}

/**
 * Lo que dice un paso. El último es «Revisar y enviar» para quien envía a revisión (el colaborador)
 * y «Revisar y publicar» para quien publica lo suyo (revisor o admin).
 */
export function stepLabel(step: EditorStep, publishesOwn: boolean): string {
  return step.slug === 'revisar' && publishesOwn ? 'Revisar y publicar' : step.label;
}

/** El paso anterior, o `undefined` si es el primero. */
export function previousStep(slug: string): EditorStep | undefined {
  const index = EDITOR_STEPS.findIndex((step) => step.slug === slug);
  return index > 0 ? EDITOR_STEPS[index - 1] : undefined;
}

/** El paso siguiente, o `undefined` si es el último. */
export function nextStep(slug: string): EditorStep | undefined {
  const index = EDITOR_STEPS.findIndex((step) => step.slug === slug);
  return index >= 0 ? EDITOR_STEPS[index + 1] : undefined;
}

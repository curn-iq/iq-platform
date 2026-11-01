/** Una pestaña del detalle de técnica. */
export interface TechniqueTab {
  /** Cómo se llama en la URL: `/tecnicas/:id/<slug>`. */
  readonly slug: string;
  /** Lo que dice la pestaña. */
  readonly label: string;
  /** `true` si sin cuenta solo se ve una vista previa (`docs/flujos.md`). */
  readonly requiresAccount: boolean;
}

/** Las pestañas del detalle, en el orden en que se muestran. */
export const TECHNIQUE_TABS: readonly TechniqueTab[] = [
  { slug: 'datos-clinicos', label: 'Datos clínicos', requiresAccount: false },
  { slug: 'instrumental', label: 'Instrumental', requiresAccount: true },
  { slug: 'mesa-de-mayo', label: 'Mesa de Mayo', requiresAccount: true },
  { slug: 'mesa-de-reserva', label: 'Mesa de reserva', requiresAccount: true },
];

/** La pestaña con la que abre una técnica (`/tecnicas/:id` redirige a ella). */
export const DEFAULT_TECHNIQUE_TAB = TECHNIQUE_TABS[0].slug;

/** La pestaña de un slug de la URL, o `undefined` si no hay una con ese nombre. */
export function findTechniqueTab(slug: string | null | undefined): TechniqueTab | undefined {
  return TECHNIQUE_TABS.find((tab) => tab.slug === slug);
}

import { plural } from './plural';
import type { ProgressStatus, VersionProgress } from './version-progress';

/** Lo que dice la marca de un paso: el avance de su sección y, en el último, el candado o la flecha. */
export type StepMark = ProgressStatus | 'locked' | 'ready';

/** Un paso del editor con lo que dice su marca y lo que falta, bajo su nombre. */
export interface StepSummary {
  slug: string;
  mark: StepMark;
  /** Lo que falta o lo que hay, en una línea («Faltan 2 campos», «3 de 5 ubicados»). */
  hint: string;
  /** Cómo se dice el estado a quien no ve la marca («completo», «en curso»…). */
  stateName: string;
}

const STATE_NAMES: Readonly<Record<StepMark, string>> = {
  complete: 'completo',
  in_progress: 'en curso',
  pending: 'pendiente',
  no_table: 'sin arreglo',
  locked: 'bloqueado',
  ready: 'listo',
};

/**
 * Lo que dicen los cinco pasos del editor, a partir del avance de la versión (`versionProgress`).
 * Los textos son los del mockup del editor, con singular y plural (Resuelto 50 de
 * `dataiq/docs/checklist-frontend.md`). El último paso es el candado mientras falte algo y la
 * flecha cuando está listo; `publishesOwn` dice si se publica (revisor o admin) o se envía.
 */
export function stepSummaries(progress: VersionProgress, publishesOwn: boolean): StepSummary[] {
  const { clinical, instrumental, mayo, reserve } = progress;
  const missingFields = clinical.missing.length;

  const summaries: { slug: string; mark: StepMark; hint: string }[] = [
    {
      slug: 'datos-clinicos',
      mark: clinical.status,
      hint:
        missingFields === 0
          ? 'Completo'
          : `${missingFields === 1 ? 'Falta' : 'Faltan'} ${plural(missingFields, 'campo', 'campos')}`,
    },
    {
      slug: 'instrumental',
      mark: instrumental.status,
      hint:
        instrumental.count === 0
          ? 'Sin instrumental'
          : plural(instrumental.count, 'objeto', 'objetos'),
    },
    { slug: 'mesa-de-mayo', mark: mayo.status, hint: tableHint(mayo) },
    { slug: 'mesa-de-reserva', mark: reserve.status, hint: tableHint(reserve) },
  ];

  const blocking = progress.blocking.length;
  summaries.push({
    slug: 'revisar',
    mark: blocking > 0 ? 'locked' : 'ready',
    hint:
      blocking === 0
        ? publishesOwn
          ? 'Lista para publicar'
          : 'Lista para enviar'
        : `${blocking === 1 ? 'Falta' : 'Faltan'} ${plural(blocking, 'paso', 'pasos')}`,
  });

  return summaries.map((summary) => ({ ...summary, stateName: STATE_NAMES[summary.mark] }));
}

function tableHint(table: VersionProgress['mayo']): string {
  if (table.status === 'no_table') return 'Sin arreglo disponible';
  // Completa sin objetos solo es una mesa que la versión dice que no lleva
  if (table.status === 'complete' && table.total === 0) return 'No lleva';
  if (table.total === 0) return 'Sin objetos';
  return `${table.placed} de ${table.total} ubicados`;
}

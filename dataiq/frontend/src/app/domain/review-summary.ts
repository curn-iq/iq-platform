import { stepSummaries, type StepMark } from './step-summary';
import type { ClinicalField, SectionKey, VersionProgress } from './version-progress';

/** Cómo se llama cada sección y en qué paso del editor se completa. */
const SECTIONS: readonly { key: SectionKey; slug: string; name: string }[] = [
  { key: 'clinical', slug: 'datos-clinicos', name: 'Datos clínicos' },
  { key: 'instrumental', slug: 'instrumental', name: 'Instrumental' },
  { key: 'mayo', slug: 'mesa-de-mayo', name: 'Mesa de Mayo' },
  { key: 'reserve', slug: 'mesa-de-reserva', name: 'Mesa de reserva' },
];

/** Los campos de los datos clínicos, con el nombre que lleva su etiqueta en el paso. */
export const CLINICAL_FIELD_LABELS: Readonly<Record<ClinicalField, string>> = {
  description: 'Para qué sirve',
  indications: 'Indicaciones',
  anesthesia: 'Anestesia',
  drapes: 'Ropa',
  patient_position: 'Posición del paciente',
  source: 'Fuente',
  sutures: 'Suturas',
};

/** Una fila del resumen de «Revisar y enviar»: una sección con su marca y lo que dice de ella. */
export interface ReviewSection {
  key: SectionKey;
  /** El paso del editor donde se completa (`/gestion/editor/:versionId/:slug`). */
  slug: string;
  name: string;
  mark: StepMark;
  /** Impide enviar o publicar: está en curso o pendiente. «Sin mesa» no bloquea. */
  blocking: boolean;
  /** Lo que falta, en lista («Anestesia», «2 objetos sin ubicar»). Vacío si no bloquea. */
  missing: string[];
  /** La línea bajo el nombre: «Falta: Anestesia, Ropa.» o lo que hay («3 de 3 ubicados.»). */
  text: string;
}

function tableMissing(total: number, placed: number): string[] {
  if (total === 0) return ['sus objetos'];
  const left = total - placed;
  return [left === 1 ? '1 objeto sin ubicar' : `${left} objetos sin ubicar`];
}

/**
 * El resumen de las cuatro secciones de la versión, a partir de su avance (`versionProgress`): los
 * textos son los del mockup del editor (Resuelto 55 de `dataiq/docs/checklist-frontend.md`). Una mesa de
 * la que la versión no dice nada (la fuente no trae su diagrama) dice «Sin arreglo disponible.» y no
 * bloquea (Resuelto 22).
 */
export function reviewSections(progress: VersionProgress): ReviewSection[] {
  const hints = new Map(stepSummaries(progress, false).map((step) => [step.slug, step.hint]));
  return SECTIONS.map(({ key, slug, name }) => {
    const blocking = progress.blocking.includes(key);
    let missing: string[] = [];
    if (blocking) {
      if (key === 'clinical') {
        missing = progress.clinical.missing.map((field) => CLINICAL_FIELD_LABELS[field]);
      } else if (key === 'instrumental') {
        missing = ['el instrumental'];
      } else {
        missing = tableMissing(progress[key].total, progress[key].placed);
      }
    }
    const mark: StepMark = progress[key].status;
    let text: string;
    if (blocking) text = `Falta: ${missing.join(', ')}.`;
    else if (key === 'clinical') text = 'Todos los campos obligatorios.';
    else text = `${hints.get(slug)}.`;
    return { key, slug, name, mark, blocking, missing, text };
  });
}

/**
 * Por qué no se puede enviar o publicar todavía, o `null` si se puede: «Para enviar falta completar
 * Datos clínicos (Anestesia, Ropa); Mesa de Mayo (2 objetos sin ubicar).».
 */
export function blockReason(sections: readonly ReviewSection[], publishes: boolean): string | null {
  const pending = sections.filter((section) => section.blocking);
  if (pending.length === 0) return null;
  const list = pending.map((section) => `${section.name} (${section.missing.join(', ')})`);
  return `Para ${publishes ? 'publicar' : 'enviar'} falta completar ${list.join('; ')}.`;
}

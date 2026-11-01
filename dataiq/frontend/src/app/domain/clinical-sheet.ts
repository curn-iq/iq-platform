/** Los datos clínicos de una técnica, con los nombres con que los entrega la API (`TechniquePublicOut`). */
export interface ClinicalFields {
  description: string | null;
  anesthesia: string | null;
  drapes: string | null;
  patient_position: string | null;
  cups_code: string | null;
  indications: string | null;
  complications: string | null;
  surgical_technique: string | null;
  source: string | null;
}

/** Una ficha corta: «Anestesia: General». Las `wide` ocupan la fila entera. */
export interface ClinicalFact {
  label: string;
  value: string;
  wide: boolean;
}

/** Un bloque de texto largo bajo su título. */
export interface ClinicalNote {
  label: string;
  text: string;
}

/** Lo que muestra la hoja de datos clínicos, ya ordenado. Lo que la fuente no trae no está. */
export interface ClinicalSheet {
  /** «Para qué sirve», que es la descripción de la técnica. */
  purpose: string | null;
  facts: ClinicalFact[];
  notes: ClinicalNote[];
  /** De dónde salen los datos de la versión. */
  source: string | null;
}

/** El texto sin espacios de los lados, o `null` si no queda nada: un campo vacío es un campo que falta. */
function present(text: string | null): string | null {
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Ordena los datos clínicos para la hoja del detalle (Resuelto 23 y 27 de
 * `dataiq/docs/checklist-frontend.md`): «Para qué sirve» es la descripción; las fichas
 * son anestesia y ropa, lado a lado, y posición del paciente y código CUPS, cada una en su fila; los textos largos son las
 * indicaciones, las complicaciones y la técnica quirúrgica. Un campo que falta (o que
 * está en blanco) no se muestra ni se rellena: la fuente manda (regla 1 de `CLAUDE.md`).
 */
export function clinicalSheet(fields: ClinicalFields): ClinicalSheet {
  const facts: { label: string; value: string | null; wide: boolean }[] = [
    { label: 'Anestesia', value: present(fields.anesthesia), wide: false },
    { label: 'Ropa', value: present(fields.drapes), wide: false },
    { label: 'Posición del paciente', value: present(fields.patient_position), wide: true },
    { label: 'Código CUPS', value: present(fields.cups_code), wide: true },
  ];
  const notes: { label: string; text: string | null }[] = [
    { label: 'Indicaciones', text: present(fields.indications) },
    { label: 'Complicaciones', text: present(fields.complications) },
    { label: 'Técnica quirúrgica', text: present(fields.surgical_technique) },
  ];
  return {
    purpose: present(fields.description),
    facts: facts.filter((fact): fact is ClinicalFact => fact.value !== null),
    notes: notes.filter((note): note is ClinicalNote => note.text !== null),
    source: present(fields.source),
  };
}

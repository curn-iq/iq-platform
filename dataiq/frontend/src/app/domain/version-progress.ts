import { ZONE_NAMES } from './table';

/** Los campos obligatorios de los datos clínicos (con los nombres de la API), en el orden del editor. */
export const REQUIRED_CLINICAL_FIELDS = [
  'description',
  'indications',
  'anesthesia',
  'drapes',
  'patient_position',
  'source',
] as const;

export type ClinicalField = (typeof REQUIRED_CLINICAL_FIELDS)[number] | 'sutures';

/**
 * Cómo va una sección de la versión. `no_table` es solo de las mesas: la versión no dice nada
 * de ella (la fuente no trae su diagrama), que no es lo mismo que no llevarla (`used: false`,
 * que es `complete`).
 */
export type ProgressStatus = 'complete' | 'in_progress' | 'pending' | 'no_table';

/** Las secciones de una versión, en el orden del editor y de Mis borradores. */
export type SectionKey = 'clinical' | 'instrumental' | 'mayo' | 'reserve';

export interface ClinicalProgress {
  status: Exclude<ProgressStatus, 'no_table'>;
  /** Lo que falta, en el orden del editor. Vacío si está completo. */
  missing: ClinicalField[];
}

export interface InstrumentalProgress {
  status: 'complete' | 'pending';
  /** Cuántos objetos tiene la versión. */
  count: number;
}

export interface TableProgress {
  status: ProgressStatus;
  /** Cuántos objetos son de esta mesa. */
  total: number;
  /** Cuántos de ellos ya tienen celda. */
  placed: number;
}

export interface VersionProgress {
  clinical: ClinicalProgress;
  instrumental: InstrumentalProgress;
  mayo: TableProgress;
  reserve: TableProgress;
  /** Las secciones que impiden enviar y publicar (en curso o pendientes), en orden. */
  blocking: SectionKey[];
  /** `true` si ninguna sección bloquea. «Sin mesa» no bloquea. */
  canSubmit: boolean;
}

/**
 * Lo que el avance toma del contenido de una versión, con los nombres de la API:
 * sirve tanto a lo que devuelve `GET /versions/{id}` como a lo que el editor tiene en
 * pantalla. Los campos opcionales no cuentan para el avance.
 */
export interface ProgressSource {
  description?: string | null;
  indications?: string | null;
  anesthesia?: string | null;
  drapes?: string | null;
  patient_position?: string | null;
  source?: string | null;
  complications?: string | null;
  surgical_technique?: string | null;
  cups_code?: string | null;
  zones: readonly {
    zone_id: string;
    /** El nombre de la mesa, como lo trae la API («Mesa de Mayo»). */
    zone: string;
    used: boolean;
    rows?: number | null;
    columns?: number | null;
  }[];
  items: readonly { zone_id: string | null; cells: readonly unknown[] }[];
  /** Una por plano. Basta con que haya una. */
  sutures: readonly unknown[];
}

/**
 * Cómo va cada sección de una versión y si se puede enviar o publicar. La regla es la de
 * Resuelto 22 de `dataiq/docs/checklist-frontend.md`: vive solo aquí, y el backend no la
 * conoce. La usan Mis borradores y el editor.
 */
export function versionProgress(version: ProgressSource): VersionProgress {
  const clinical = clinicalProgress(version);
  const instrumental = instrumentalProgress(version);
  const mayo = tableProgress(version, ZONE_NAMES.mayo);
  const reserve = tableProgress(version, ZONE_NAMES.reserve);

  const sections: [SectionKey, ProgressStatus][] = [
    ['clinical', clinical.status],
    ['instrumental', instrumental.status],
    ['mayo', mayo.status],
    ['reserve', reserve.status],
  ];
  const blocking = sections
    .filter(([, status]) => status === 'in_progress' || status === 'pending')
    .map(([key]) => key);

  return { clinical, instrumental, mayo, reserve, blocking, canSubmit: blocking.length === 0 };
}

function clinicalProgress(version: ProgressSource): ClinicalProgress {
  const missing: ClinicalField[] = REQUIRED_CLINICAL_FIELDS.filter(
    (field) => (version[field] ?? '').trim() === '',
  );
  if (version.sutures.length === 0) missing.push('sutures');

  const total = REQUIRED_CLINICAL_FIELDS.length + 1;
  const status =
    missing.length === 0 ? 'complete' : missing.length < total ? 'in_progress' : 'pending';
  return { status, missing };
}

function instrumentalProgress(version: ProgressSource): InstrumentalProgress {
  const count = version.items.length;
  return { status: count > 0 ? 'complete' : 'pending', count };
}

function tableProgress(version: ProgressSource, name: string): TableProgress {
  const zone = version.zones.find((candidate) => candidate.zone === name);
  if (zone === undefined) return { status: 'no_table', total: 0, placed: 0 };
  if (!zone.used) return { status: 'complete', total: 0, placed: 0 };

  const items = version.items.filter((item) => item.zone_id === zone.zone_id);
  const total = items.length;
  const placed = items.filter((item) => item.cells.length > 0).length;
  // Una mesa que se lleva y aún no tiene objetos está pendiente, no completa.
  const status =
    total === 0
      ? 'pending'
      : placed === total
        ? 'complete'
        : placed > 0
          ? 'in_progress'
          : 'pending';
  return { status, total, placed };
}

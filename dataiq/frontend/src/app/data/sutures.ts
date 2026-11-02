import type { EditorSuture } from '../domain/editor-content';
import type { PlaneSuture } from '../domain/instrumental-sheet';
import type { Suture } from './api/models';

/**
 * Las suturas de una técnica, una por plano. La carga inicial junta en una sola sutura los
 * planos que comparten sutura, calibre y aguja (la API rechaza una sutura repetida) y los
 * guarda en `usage` separados por «; » («Piel; Fascia»); aquí se vuelven a separar
 * (Resuelto 29 de `dataiq/docs/checklist-frontend.md`). Una sutura sin plano da una sola
 * fila sin plano. Todo en el orden en que llega de la API.
 */
export function toPlaneSutures(
  sutures: readonly Pick<Suture, 'name' | 'gauge' | 'needle_type' | 'usage'>[],
): PlaneSuture[] {
  return sutures.flatMap((suture): PlaneSuture[] => {
    const base = { name: suture.name, gauge: suture.gauge, needleType: suture.needle_type };
    const planes = (suture.usage ?? '')
      .split(';')
      .map((plane) => plane.trim())
      .filter((plane) => plane !== '');
    return planes.length === 0
      ? [{ ...base, plane: null }]
      : planes.map((plane) => ({ ...base, plane }));
  });
}

/**
 * Las filas de «Suturas por plano» del editor a partir de las suturas de la API: una por plano
 * (`toPlaneSutures`), con el texto vacío donde no hay dato.
 */
export function toSutureRows(
  sutures: readonly Pick<Suture, 'name' | 'gauge' | 'needle_type' | 'usage'>[],
): EditorSuture[] {
  return toPlaneSutures(sutures).map((suture) => ({
    plane: suture.plane ?? '',
    name: suture.name,
    gauge: suture.gauge ?? '',
    needle_type: suture.needleType ?? '',
  }));
}

/** Una sutura como la recibe `PUT /versions/{id}`, con los planos juntos en `usage`. */
export interface JoinedSuture {
  name: string;
  gauge: string | null;
  needle_type: string | null;
  usage: string | null;
}

/** Lo vacío o en blanco es «sin dato»: `null`. */
function optional(value: string): string | null {
  const clean = value.trim();
  return clean === '' ? null : clean;
}

/**
 * Lo contrario de `toSutureRows`: lo que `PUT /versions/{id}` recibe. La API rechaza una sutura repetida
 * (mismo nombre, calibre y aguja), así que las filas que comparten esos tres datos se juntan en una sola
 * sutura, con sus planos en `usage` separados por «; » y sin repetirse, como la carga inicial
 * (Resuelto 29 de `dataiq/docs/checklist-frontend.md`). Una fila sin nombre no se manda (la API lo
 * exige); una sin plano es una sutura sin `usage`, o suma sus planos a la misma sutura si otra fila los
 * tiene. Las suturas van en el orden de su primera fila, y los planos, en el de sus filas. Un plano
 * escrito con «;» cuenta como varios.
 */
export function joinPlaneSutures(rows: readonly EditorSuture[]): JoinedSuture[] {
  const groups = new Map<
    string,
    { name: string; gauge: string | null; needle_type: string | null; planes: string[] }
  >();

  for (const row of rows) {
    const name = row.name.trim();
    if (name === '') continue;
    const gauge = optional(row.gauge);
    const needle = optional(row.needle_type);
    const key = JSON.stringify([name, gauge, needle]);
    const group = groups.get(key) ?? { name, gauge, needle_type: needle, planes: [] };
    groups.set(key, group);
    for (const plane of row.plane.split(';').map((part) => part.trim())) {
      if (plane !== '' && !group.planes.includes(plane)) group.planes.push(plane);
    }
  }

  return [...groups.values()].map(({ planes, ...suture }) => ({
    ...suture,
    usage: planes.length > 0 ? planes.join('; ') : null,
  }));
}

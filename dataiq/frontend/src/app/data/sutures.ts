import type { PlaneSuture } from '../domain/instrumental-sheet';
import type { Suture } from './api/models';

/**
 * Las suturas de una técnica, una por plano. La carga inicial junta en una sola sutura los
 * planos que comparten sutura, calibre y aguja (la API rechaza una sutura repetida) y los
 * guarda en `usage` separados por «; » («Piel; Fascia»); aquí se vuelven a separar
 * (Resuelto 29 de `dataiq/docs/checklist-frontend.md`). Una sutura sin plano da una sola
 * fila sin plano. Todo en el orden en que llega de la API.
 */
export function toPlaneSutures(sutures: readonly Suture[]): PlaneSuture[] {
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

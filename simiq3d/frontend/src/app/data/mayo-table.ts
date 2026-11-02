import { itemName } from '../domain/item-name';
import type { MayoTable } from '../domain/mayo-table';
import type { TechniqueInstruments } from './api/models';

/** Cómo se llama la mesa de Mayo en DataIQ (`zones[].zone`). */
export const MAYO_ZONE = 'Mesa de Mayo';

/**
 * La mesa de Mayo de una técnica, a partir de `GET /techniques/{id}/instruments`.
 * `null` si la técnica no la lleva (`used: false`) o si DataIQ no trae su tamaño:
 * sin tamaño no se puede dibujar sin inventarlo. Solo van los objetos de esa mesa;
 * los de la mesa de reserva no son del alcance del MVP.
 */
export function toMayoTable(technique: TechniqueInstruments): MayoTable | null {
  const zone = technique.zones.find((z) => z.zone === MAYO_ZONE);
  if (!zone || !zone.used || zone.rows === null || zone.columns === null) return null;
  return {
    rows: zone.rows,
    columns: zone.columns,
    items: technique.items
      .filter((item) => item.zone_id === zone.zone_id)
      .map((item) => ({
        id: item.id,
        legendNumber: item.legend_number,
        name: itemName(
          item.components.map((component) => component.name),
          item.source_text,
        ),
        instrumentIds: item.components.flatMap((component) =>
          component.instrument_id === null ? [] : [component.instrument_id],
        ),
        cells: item.cells.map((cell) => ({ row: cell.row, column: cell.column })),
      })),
  };
}

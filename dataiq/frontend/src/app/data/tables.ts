import type { Table } from '../domain/table';
import type { TechniqueItem, ZoneLayout } from './api/models';

/**
 * Las mesas que hay que dibujar a partir de `zones` e `items` de la API. Una
 * mesa con `used: false` es una mesa que la técnica no lleva, y una usada sin
 * tamaño no se puede dibujar sin inventarlo: las dos quedan fuera, con sus
 * objetos. Cada objeto va a su mesa (`zone_id`); el que no tiene mesa es solo
 * del listado de instrumental y no es del diagrama.
 */
export function toTables(zones: readonly ZoneLayout[], items: readonly TechniqueItem[]): Table[] {
  return zones.flatMap((zone) =>
    zone.used && zone.rows !== null && zone.columns !== null
      ? [
          {
            zoneId: zone.zone_id,
            name: zone.zone,
            rows: zone.rows,
            columns: zone.columns,
            items: items
              .filter((item) => item.zone_id === zone.zone_id)
              .map((item) => ({
                id: item.id,
                legendNumber: item.legend_number,
                cells: item.cells.map((cell) => ({ row: cell.row, column: cell.column })),
              })),
          },
        ]
      : [],
  );
}

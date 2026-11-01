import { itemName } from '../domain/item-name';
import type { Table } from '../domain/table';
import type { TechniqueItem, ZoneLayout } from './api/models';

/**
 * Si la versión dice que no lleva esa mesa (`used: false`, el «no lleva» de los
 * documentos de IQ). Sin fila de esa mesa, o usada sin tamaño, no lo dice: la mesa
 * falta en los datos, que no es lo mismo que no llevarla.
 */
export function isZoneOmitted(zones: readonly ZoneLayout[], name: string): boolean {
  return zones.some((zone) => zone.zone === name && !zone.used);
}

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
              .map((item) => {
                const components = item.components.map((component) => component.name);
                return {
                  id: item.id,
                  legendNumber: item.legend_number,
                  name: itemName(components, item.source_text),
                  components,
                  instruments: item.components
                    .filter((component) => component.suture_id === null)
                    .map((component) => component.name),
                  cells: item.cells.map((cell) => ({ row: cell.row, column: cell.column })),
                };
              }),
          },
        ]
      : [],
  );
}

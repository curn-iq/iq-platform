import type { Table } from '../domain/table';
import type { ZoneLayout } from './api/models';

/**
 * Las mesas que hay que dibujar a partir de `zones` de la API. Una mesa con
 * `used: false` es una mesa que la técnica no lleva, y una usada sin tamaño no
 * se puede dibujar sin inventarlo: las dos quedan fuera.
 */
export function toTables(zones: readonly ZoneLayout[]): Table[] {
  return zones.flatMap((zone) =>
    zone.used && zone.rows !== null && zone.columns !== null
      ? [{ zoneId: zone.zone_id, name: zone.zone, rows: zone.rows, columns: zone.columns }]
      : [],
  );
}

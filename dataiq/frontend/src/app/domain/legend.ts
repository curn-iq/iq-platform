import type { TableItem } from './table';

/**
 * - `placed`: está en la mesa (tiene celdas): se puede señalar.
 * - `unplaced`: se sabe qué es (tiene componentes) pero la fuente no dice dónde va.
 * - `gap`: un número que la fuente da y no deja leer: no se sabe qué es ni dónde va.
 */
export type LegendKind = 'placed' | 'unplaced' | 'gap';

export interface LegendEntry {
  id: string;
  number: number;
  /** Lo que dice la fila; `null` en un hueco: el texto crudo de la fuente no se muestra. */
  name: string | null;
  kind: LegendKind;
}

/**
 * Las filas de la leyenda de una mesa, por número. Todo objeto con número tiene
 * su fila; sin número no hay fila. Lo que la fuente no ubica no se esconde (un
 * número que falta se dice, no se rellena): se lista con su nombre, y si ni
 * siquiera se sabe qué es, queda como hueco.
 */
export function legendEntries(items: readonly TableItem[]): LegendEntry[] {
  return items
    .flatMap((item): LegendEntry[] => {
      if (item.legendNumber === null) return [];
      const base = { id: item.id, number: item.legendNumber };
      if (item.cells.length > 0) return [{ ...base, name: item.name, kind: 'placed' }];
      if (item.components.length > 0) return [{ ...base, name: item.name, kind: 'unplaced' }];
      return [{ ...base, name: null, kind: 'gap' }];
    })
    .sort((a, b) => a.number - b.number);
}

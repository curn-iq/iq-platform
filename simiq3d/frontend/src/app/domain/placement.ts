import { itemCenter, MayoTable } from './mayo-table';

/**
 * Cómo se arma cada objeto de la mesa en la escena: qué modelos 3D lleva y
 * dónde va su centro (`simiq3d/README.md`, «Cómo se arma la mesa en 3D»).
 */

/** Un modelo 3D de un objeto. */
export interface PlacedModel {
  /** El GLB, como lo da `GET /models` (`kelly_forceps.glb`). */
  file: string;
  /**
   * Si es una hoja de bisturí, el índice del mango en el que se monta (se cuelga
   * de su nodo `blade_mount`, sin moverla ni girarla); si no, `null`: va sobre la
   * mesa, al lado de los demás modelos sueltos del mismo objeto.
   */
  mountOn: number | null;
}

/** Un objeto de la mesa listo para la escena. */
export interface PlacedItem {
  itemId: string;
  legendNumber: number | null;
  /** El centro del objeto sobre la mesa, en metros (ver `mayo-table.ts`). */
  x: number;
  z: number;
  models: PlacedModel[];
}

// Los nombres de los GLB del bisturí (`simiq3d/models/README.md`, «Mango y hoja»)
const HANDLE = /^scalpel_handle_/;
const BLADE = /^scalpel_blade_/;

/**
 * Los objetos de la mesa que tienen algo que dibujar. Un instrumento sin modelo
 * 3D no se dibuja (sigue en la leyenda), y un objeto sin celdas no tiene dónde ir:
 * la fuente no lo dice. Una hoja de bisturí se monta en el mango del mismo objeto;
 * sin mango, va suelta sobre la mesa.
 */
export function placeItems(
  table: MayoTable,
  modelFor: (instrumentId: string) => string | undefined,
): PlacedItem[] {
  return table.items.flatMap((item) => {
    const center = itemCenter(table, item.cells);
    const files = item.instrumentIds.flatMap((id) => {
      const file = modelFor(id);
      return file === undefined ? [] : [file];
    });
    if (center === null || files.length === 0) return [];
    const handle = files.findIndex((file) => HANDLE.test(file));
    return [
      {
        itemId: item.id,
        legendNumber: item.legendNumber,
        x: center.x,
        z: center.z,
        models: files.map((file) => ({
          file,
          mountOn: BLADE.test(file) && handle >= 0 ? handle : null,
        })),
      },
    ];
  });
}

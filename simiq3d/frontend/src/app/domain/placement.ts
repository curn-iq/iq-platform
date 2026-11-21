import { ComponentPlacement, itemCenter, MayoTable } from './mayo-table';

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
  placement?: ComponentPlacement;
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

/** Enfrenta las valvas y deja que se distingan los dos perfiles de Farabeuf. */
function faceFarabeuf(placements: ComponentPlacement[]): ComponentPlacement[] {
  const [first, second] = placements;
  if (!first || !second || (first.yawDeg - second.yawDeg) % 180 !== 0) return placements;
  const axis = first.yawDeg % 180 === 0 ? 'z' : 'x';
  const gap = second[axis] - first[axis];
  const direction = gap < 0 ? -1 : 1;
  // El perfil de canto mide unos 38 mm. La luz entre valvas es de 3 mm.
  const offset = (direction * Math.max(0, 0.041 - Math.abs(gap))) / 2;
  const towardOther = axis === 'x' ? direction * 90 : direction > 0 ? 180 : 0;
  const opposed = ((towardOther + 360) % 360) - 180;
  return [
    { ...first, [axis]: first[axis] - offset, yawDeg: towardOther },
    { ...second, [axis]: second[axis] + offset, yawDeg: opposed },
    ...placements.slice(2),
  ];
}

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
    const files = item.components.flatMap((component) => {
      const file = component.instrumentId === null ? undefined : modelFor(component.instrumentId);
      if (file === undefined) return [];
      if (!component.placement) return [{ file, placement: undefined }];
      const placements = [component.placement, ...(component.additionalPlacements ?? [])].map(
        (placement) => ({ ...placement, yawDeg: 90 * Math.round(placement.yawDeg / 90) }),
      );
      const visible = file === 'farabeuf_retractor.glb' ? faceFarabeuf(placements) : placements;
      return visible.map((placement) => ({ file, placement }));
    });
    if (files.length === 0) return [];
    const measured = files.flatMap(({ placement }) => (placement ? [placement] : []));
    const cell = itemCenter(table, item.cells);
    const center =
      measured.length > 0
        ? {
            x: measured.reduce((sum, point) => sum + point.x, 0) / measured.length,
            z: measured.reduce((sum, point) => sum + point.z, 0) / measured.length,
          }
        : cell;
    if (center === null) return [];
    const handle = files.findIndex(({ file }) => HANDLE.test(file));
    return [
      {
        itemId: item.id,
        legendNumber: item.legendNumber,
        x: center.x,
        z: center.z,
        models: files.map(({ file, placement }) => ({
          file,
          ...(placement ? { placement } : {}),
          mountOn: BLADE.test(file) && handle >= 0 ? handle : null,
        })),
      },
    ];
  });
}

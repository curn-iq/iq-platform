import { itemName } from './item-name';

/** Lo que la hoja de Instrumental toma de `GET /techniques/{id}/instruments`, con los nombres de la API. */
export interface InstrumentalSource {
  items: { source_text: string; components: { name: string }[] }[];
  sutures: PlaneSuture[];
  equipment: { name: string }[];
  devices: { name: string }[];
}

/** Una sutura en un plano: una fila de la hoja. `data/sutures.ts` las separa de lo que entrega la API. */
export interface PlaneSuture {
  /** «Piel», «Fascia»…; `null` si la fuente no dice en qué plano se usa. */
  plane: string | null;
  name: string;
  gauge: string | null;
  needleType: string | null;
}

/** Una fila de suturas: el plano y la sutura que se usa en él. */
export interface SutureRow {
  /** «Piel», «Fascia»…; `null` si la fuente no dice en qué plano se usa. */
  plane: string | null;
  /** La sutura con su calibre y su aguja: «Seda 2/0, aguja cortante de 3/8 de círculo». */
  text: string;
}

/** Lo que muestra la hoja de Instrumental, ya ordenado. */
export interface InstrumentalSheet {
  /** Los objetos de la técnica (incluidos los que no tienen lugar en la mesa), por su nombre. */
  objects: string[];
  sutures: SutureRow[];
  /** Equipos biomédicos. */
  equipment: string[];
  /** Equipo médico-quirúrgico. */
  devices: string[];
}

/**
 * Ordena el instrumental de una técnica para su hoja. Cada objeto lleva el nombre de la
 * leyenda (`itemName`) y cada sutura, una fila por plano (`data/sutures.ts` ya las separó).
 * Todo en el orden en que llega de la API.
 */
export function instrumentalSheet(source: InstrumentalSource): InstrumentalSheet {
  return {
    objects: source.items.map((item) =>
      itemName(
        item.components.map((component) => component.name),
        item.source_text,
      ),
    ),
    sutures: source.sutures.map((suture) => ({ plane: suture.plane, text: sutureText(suture) })),
    equipment: source.equipment.map((element) => element.name),
    devices: source.devices.map((element) => element.name),
  };
}

/** «Seda 2/0, aguja cortante»: el nombre con su calibre, y la aguja tras una coma. */
function sutureText(suture: PlaneSuture): string {
  const thread = [suture.name, suture.gauge].filter(Boolean).join(' ');
  return [thread, suture.needleType].filter(Boolean).join(', ');
}

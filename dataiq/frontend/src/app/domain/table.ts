/**
 * Una mesa de la técnica (la de Mayo o la de reserva) tal como la dibuja el
 * diagrama: su tamaño en celdas. Es la forma que le sirve a la pantalla, no la
 * de la API; `data/tables.ts` la arma.
 */
export interface Table {
  zoneId: string;
  /** El nombre de la mesa, como lo trae la API («Mesa de Mayo»). */
  name: string;
  rows: number;
  columns: number;
}

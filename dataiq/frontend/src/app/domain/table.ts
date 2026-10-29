/** Una celda de la grilla, contada desde 1: la fila 1 es la de arriba y la columna 1, la de la izquierda. */
export interface TableCell {
  row: number;
  column: number;
}

/**
 * Un objeto físico de la mesa. Aunque ocupe varias celdas, es uno solo y lleva
 * un solo número. Sin celdas, la fuente no dice dónde va; sin número, la fuente
 * no le puso (o no deja leerlo).
 */
export interface TableItem {
  id: string;
  legendNumber: number | null;
  /** Lo que dice la leyenda: sus componentes unidos con «y» (`itemName`). */
  name: string;
  /** Los nombres de sus componentes del catálogo; el diagrama elige su dibujo por ellos. */
  components: string[];
  cells: TableCell[];
}

/**
 * Una mesa de la técnica (la de Mayo o la de reserva) tal como la dibuja el
 * diagrama: su tamaño en celdas y sus objetos. Es la forma que le sirve a la
 * pantalla, no la de la API; `data/tables.ts` la arma.
 */
export interface Table {
  zoneId: string;
  /** El nombre de la mesa, como lo trae la API («Mesa de Mayo»). */
  name: string;
  rows: number;
  columns: number;
  items: TableItem[];
}

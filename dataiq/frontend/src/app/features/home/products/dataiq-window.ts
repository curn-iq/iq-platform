import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DEMO_TABLE } from '../demo-table';
import { HomeCatalog } from '../home-catalog';
import { HomeTable } from '../home-table/home-table';

/** Cuántas especialidades y cuántas técnicas de cada una se asoman en la lista de la ventana. */
const LISTED_SPECIALTIES = 4;
const LISTED_PER_SPECIALTY = 2;

/** Cuántos objetos de la mesa se listan en la ventana; el resto va en «y n piezas más». */
const LISTED_PIECES = 7;

/**
 * La ventana de DataIQ del carril: la lista de técnicas (las reales del catálogo,
 * agrupadas por especialidad) y, a la derecha, la mesa de ejemplo con su leyenda.
 * Es una maqueta: lo dice la marca «demostración», y la mesa no es la de ninguna
 * de las técnicas de la lista. Decorativa para los lectores de pantalla: el
 * texto del producto está a su lado.
 */
@Component({
  selector: 'app-dataiq-window',
  imports: [HomeTable],
  templateUrl: './dataiq-window.html',
  styleUrl: './dataiq-window.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class DataiqWindow {
  private readonly catalog = inject(HomeCatalog);

  protected readonly table = DEMO_TABLE;
  protected readonly listed = this.table.items.slice(0, LISTED_PIECES);
  protected readonly more = this.table.items.length - LISTED_PIECES;

  protected readonly groups = computed(() =>
    this.catalog
      .groups()
      .slice(0, LISTED_SPECIALTIES)
      .map((group) => ({
        specialty: group.specialty,
        techniques: group.techniques.slice(0, LISTED_PER_SPECIALTY),
      })),
  );
}

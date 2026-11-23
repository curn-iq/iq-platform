import { Component, input } from '@angular/core';

/**
 * Un grupo como en la página «Nosotros»: abierto por un filete de 2 px en tinta, con el nombre
 * a la izquierda y el lema (o la cuenta) en `tinta-3` a la derecha; sus filas, separadas por
 * un filete de 1 px. Cada fila es un elemento con la clase `row` (ver `group.scss`), o una
 * columna de la rejilla (`.columns`).
 */
@Component({
  selector: 'app-group',
  host: { '[class.multi]': 'columns() > 1', '[style.--cols]': 'columns()' },
  template: `
    <header class="head">
      <h2 class="name">{{ name() }}</h2>
      @if (note()) {
        <p class="note">{{ note() }}</p>
      }
    </header>
    <div class="rows">
      <ng-content />
    </div>
  `,
  styleUrl: './group.scss',
})
export class Group {
  readonly name = input.required<string>();
  readonly note = input<string>();
  /** Desde 900 px de ancho, las filas se reparten en tantas columnas. */
  readonly columns = input(1);
}

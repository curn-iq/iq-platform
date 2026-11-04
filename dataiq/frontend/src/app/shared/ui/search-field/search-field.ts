import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChild,
} from '@angular/core';

/** Para que cada campo enlace su propia etiqueta: dos en una página no comparten id. */
let nextId = 0;

/**
 * El buscador, según «Buscador del catálogo» en «Inputs / Fields» de `DESIGN.md`:
 * 60 px, `superficie`, 14 px de radio, filete `filete-2` y lupa de 20 px. Foco: filete
 * de 2 px en `marca`. Al escribir aparece a la derecha el botón de borrar, que deja
 * el campo vacío y le devuelve el foco. `value` es lo escrito: `[(value)]`.
 *
 * `size="compact"` es el de la columna de técnicas del detalle: 42 px, sobre `fondo`,
 * 10 px de radio y filete de 1 px, con la lupa de 16 px.
 *
 * `size="medium"` es el de «Usuarios y roles (página)»: 52 px, 12 px de radio y filete de 1 px
 * en `filete-2`, con la lupa de 18 px. El ancho lo pone quien lo use.
 */
@Component({
  selector: 'app-search-field',
  templateUrl: './search-field.html',
  styleUrl: './search-field.scss',
  host: {
    '[class.compact]': "size() === 'compact'",
    '[class.medium]': "size() === 'medium'",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchField {
  /** Lo que dice el campo para quien no lo ve (el `<label>`). */
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly value = model('');
  readonly size = input<'large' | 'medium' | 'compact'>('large');

  protected readonly id = `search-field-${nextId++}`;

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected clear(): void {
    this.value.set('');
    this.field().nativeElement.focus();
  }
}

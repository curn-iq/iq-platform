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
 */
@Component({
  selector: 'app-search-field',
  templateUrl: './search-field.html',
  styleUrl: './search-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchField {
  /** Lo que dice el campo para quien no lo ve (el `<label>`). */
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly value = model('');

  protected readonly id = `search-field-${nextId++}`;

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected clear(): void {
    this.value.set('');
    this.field().nativeElement.focus();
  }
}

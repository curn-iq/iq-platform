import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { FieldError } from '../field-error/field-error';

/** Para que cada selector enlace su propia etiqueta: dos en una página no comparten id. */
let nextId = 0;

/** Una opción del selector: lo que se guarda (`value`) y lo que se lee (`label`). */
export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Un selector de formulario, según «Editor de técnica (página)» de `DESIGN.md`: la misma caja
 * de 48 px del campo de texto, con la flecha de la casa en vez de la nativa y su texto vacío
 * en `tinta-2`. Es un control de Signal Forms (`<app-select-field label="Especialidad"
 * [options]="…" [formField]="form.specialty" />`) y también se usa con `[value]` y
 * `(valueChange)`. `placeholder` es la primera opción, con valor vacío: elegirla deja el selector
 * sin elegir. `badge` suma la pastilla junto a la etiqueta, como en el campo de texto. `disabled` deja
 * ver lo elegido sin cambiarlo (p. ej. mientras se crea la técnica con esa especialidad), sobre `fondo`
 * como el campo de solo lectura.
 */
@Component({
  selector: 'app-select-field',
  imports: [FieldError],
  templateUrl: './select-field.html',
  styleUrl: './select-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectField implements FormValueControl<string> {
  /** Lo que dice la etiqueta, que también la lee quien no ve el campo. */
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
  /** Lo que dice mientras no hay nada elegido. */
  readonly placeholder = input('');
  /** El texto de la pastilla junto a la etiqueta; sin texto, no hay pastilla. */
  readonly badge = input('');
  /** No se puede cambiar: se ve lo elegido. */
  readonly disabled = input(false);
  /** Los errores de validación y si se tocó: los enlaza `[formField]`. */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly touched = input(false);
  /** El `value` de la opción elegida, o vacío. */
  readonly value = model('');
  /** Avisa que el selector perdió el foco, para que el formulario lo marque como tocado. */
  readonly touch = output<void>();

  protected readonly id = `select-field-${nextId++}`;
  protected readonly error = computed(() =>
    this.touched() ? this.errors().find((error) => error.message)?.message : undefined,
  );

  private readonly select = viewChild.required<ElementRef<HTMLSelectElement>>('select');

  /** Lo pide `[formField]` para llevar el foco al primer campo con error. */
  focus(options?: FocusOptions): void {
    this.select().nativeElement.focus(options);
  }
}

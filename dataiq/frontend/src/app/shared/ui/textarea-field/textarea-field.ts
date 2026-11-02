import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

/** Para que cada campo enlace su propia etiqueta: dos en una página no comparten id. */
let nextId = 0;

/**
 * Un área de texto de formulario, según «Editor de técnica (página)» de `DESIGN.md`: la misma etiqueta
 * y la misma caja del campo de texto, pero de al menos 104 px de alto (156 px con `tall`) y que se
 * puede alargar a mano. `badge` suma junto a la etiqueta la pastilla «Falta»; `optional`, el texto
 * «Opcional». `readonly` deja ver el texto sin cambiarlo, sobre `fondo`. Es un control de Signal Forms
 * y también se usa con `[(value)]`.
 */
@Component({
  selector: 'app-textarea-field',
  templateUrl: './textarea-field.html',
  styleUrl: './textarea-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextareaField implements FormValueControl<string> {
  /** Lo que dice la etiqueta, que también la lee quien no ve el campo. */
  readonly label = input.required<string>();
  readonly placeholder = input('');
  /** El texto de la pastilla junto a la etiqueta; sin texto, no hay pastilla. */
  readonly badge = input('');
  /** Dice «Opcional» junto a la etiqueta, en vez de la pastilla. */
  readonly optional = input(false, { transform: booleanAttribute });
  /** Solo se lee: el texto se ve y se puede seleccionar, pero no se cambia. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** La caja alta (156 px), para los textos largos. */
  readonly tall = input(false, { transform: booleanAttribute });
  readonly value = model('');
  /** Avisa que el campo perdió el foco. */
  readonly touch = output<void>();

  protected readonly id = `textarea-field-${nextId++}`;

  private readonly field = viewChild.required<ElementRef<HTMLTextAreaElement>>('field');

  /** Lo pide `[formField]` para llevar el foco al primer campo con error. */
  focus(options?: FocusOptions): void {
    this.field().nativeElement.focus(options);
  }
}

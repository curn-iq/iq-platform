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
import type { FormCheckboxControl, ValidationError } from '@angular/forms/signals';
import { FieldError } from '../field-error/field-error';

/** Para que cada casilla enlace su propio error: dos en una página no comparten id. */
let nextId = 0;

/**
 * Una casilla de verificación de formulario, según «Ingresar / Crear cuenta (página)» de
 * `DESIGN.md` (la de aceptar el aviso de privacidad): su texto va dentro, con enlaces si hace
 * falta (`<app-checkbox-field [formField]="form.accepted">Acepto el <a …>aviso</a>.</app-checkbox-field>`).
 * Es un control de Signal Forms. Un error de validación se dice bajo el texto una vez tocada la
 * casilla o intentado enviar el formulario, y la casilla se marca con un contorno de 2 px en `tinta`
 * (no en rojo).
 */
@Component({
  selector: 'app-checkbox-field',
  imports: [FieldError],
  templateUrl: './checkbox-field.html',
  styleUrl: './checkbox-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxField implements FormCheckboxControl {
  /** Si está marcada: la enlaza `[formField]`. */
  readonly checked = model(false);
  /** Los errores de validación y si se tocó: los enlaza `[formField]`. */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly touched = input(false);
  /** Avisa que la casilla perdió el foco, para que el formulario la marque como tocada. */
  readonly touch = output<void>();

  protected readonly errorId = `checkbox-field-${nextId++}-error`;
  /** El mensaje del primer error, una vez tocada la casilla. */
  protected readonly error = computed(() =>
    this.touched() ? this.errors().find((error) => error.message)?.message : undefined,
  );

  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  /** Lo pide `[formField]` para llevar el foco al primer campo con error. */
  focus(options?: FocusOptions): void {
    this.box().nativeElement.focus(options);
  }
}

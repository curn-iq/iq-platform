import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

/** Para que cada campo enlace su propia etiqueta: dos en una página no comparten id. */
let nextId = 0;

/**
 * Un campo de texto de formulario, según «Inputs / Fields» y «Ingresar / Crear cuenta
 * (página)» de `DESIGN.md`: etiqueta de 14 px 600 en `tinta-2` sobre una caja de 48 px,
 * `superficie`, 10 px de radio y filete `filete-2`; foco: filete de 2 px en `marca`.
 * Es un control de Signal Forms: `<app-text-field label="Correo" [formField]="form.email" />`.
 *
 * `revealable` (para contraseñas) suma a la derecha «Mostrar» / «Ocultar», que deja ver lo
 * escrito. El botón no le quita el foco a la caja.
 */
@Component({
  selector: 'app-text-field',
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextField implements FormValueControl<string> {
  /** Lo que dice la etiqueta, que también la lee quien no ve el campo. */
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly autocomplete = input('');
  readonly placeholder = input('');
  readonly revealable = input(false, { transform: booleanAttribute });
  /** Lo escrito: lo enlaza `[formField]`. */
  readonly value = model('');
  /** Avisa que el campo perdió el foco, para que el formulario lo marque como tocado. */
  readonly touch = output<void>();

  protected readonly id = `text-field-${nextId++}`;
  protected readonly shown = signal(false);

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  /** Lo pide `[formField]` para llevar el foco al primer campo con error. */
  focus(options?: FocusOptions): void {
    this.field().nativeElement.focus(options);
  }

  protected toggle(): void {
    this.shown.update((shown) => !shown);
  }
}

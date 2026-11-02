import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Lo que hay que corregir en un campo, bajo él: el círculo de alerta y el mensaje en `tinta` 600
 * (14.5 px), sin rojo, porque el rojo es de la cámara (ver «The Dos Acentos Cautivos Rule» y
 * «Ingresar / Crear cuenta (página)» en `DESIGN.md`). El mensaje dice qué hacer, en voz impersonal.
 * Es una región `role="alert"`: se anuncia en cuanto aparece.
 */
@Component({
  selector: 'app-field-error',
  templateUrl: './field-error.html',
  styleUrl: './field-error.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'alert' },
})
export class FieldError {
  readonly message = input.required<string>();
}

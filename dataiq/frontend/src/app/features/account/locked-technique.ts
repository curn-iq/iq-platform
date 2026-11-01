import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TECHNIQUE_TABS } from '../../domain/technique-tabs';

/** Lo que promete la cuenta; es la frase de la puerta del detalle, sin prometer una mesa. */
const PROMISE = 'Con una cuenta gratuita se abre todo el detalle de esta técnica.';

/**
 * La técnica que se quería abrir, en la mitad izquierda de la pantalla de cuenta: su ruta,
 * su nombre, su especialidad y una vista bloqueada con las cuatro pestañas del detalle (el
 * mismo cuerpo de barras para todas, así que nunca revela si a la técnica le falta una mesa)
 * y un candado con lo que abre la cuenta. En celular la vista bloqueada se reemplaza por
 * una línea con el candado. Ver «Ingresar / Crear cuenta (página)» en `DESIGN.md`.
 *
 * Mientras llegan el nombre y la especialidad, `undefined`, se dibujan barras.
 */
@Component({
  selector: 'app-locked-technique',
  imports: [RouterLink],
  templateUrl: './locked-technique.html',
  styleUrl: './locked-technique.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LockedTechnique {
  readonly name = input<string>();
  readonly specialty = input<string>();

  protected readonly tabLabels = TECHNIQUE_TABS.map((tab) => tab.label);
  protected readonly promise = PROMISE;
  /** Los anchos de las barras del cuerpo bloqueado, en dos columnas. */
  protected readonly columns = [
    [82, 64, 90, 58],
    [74, 86, 60, 70],
  ];
}

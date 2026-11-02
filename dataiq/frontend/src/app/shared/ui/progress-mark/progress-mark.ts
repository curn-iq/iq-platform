import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import type { ProgressStatus } from '../../../domain/version-progress';

/**
 * Lo que puede decir una marca: el avance de una sección y, en el último paso del editor, el candado
 * (`locked`, mientras falte algo) y la flecha (`ready`, cuando está listo).
 */
export type MarkStatus = ProgressStatus | 'locked' | 'ready';

/** Lo que dice cada marca para quien no la ve. */
export const PROGRESS_LABELS: Readonly<Record<MarkStatus, string>> = {
  complete: 'Completa',
  in_progress: 'En curso',
  pending: 'Pendiente',
  no_table: 'La técnica no tiene esa mesa',
  locked: 'Bloqueado',
  ready: 'Listo',
};

/**
 * La marca de avance de una sección (22 px), según «Mis borradores (página)» de `DESIGN.md`:
 * completa, llena en `marca` con un visto blanco; en curso, medio llena; pendiente, solo el
 * anillo `filete-2`; y la técnica que no tiene esa mesa, una raya `tinta-3`. Al cargar se
 * traza: `column` y `row` la escalonan (90 ms por columna y 45 ms por fila); sin
 * `animated`, como en la leyenda, queda quieta. Con `retrace` (los pasos del editor) vuelve a
 * trazarse cada vez que cambia de estado. Es decorativa: el texto va para los lectores de pantalla.
 */
@Component({
  selector: 'app-progress-mark',
  templateUrl: './progress-mark.html',
  styleUrl: './progress-mark.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-status]': 'status()',
    '[attr.data-size]': 'size()',
    '[attr.data-animated]': 'traced()',
    '[style.--c]': 'column()',
    '[style.--f]': 'row()',
  },
})
export class ProgressMark {
  readonly status = input.required<MarkStatus>();
  /** `small` (16 px) es el de la leyenda. */
  readonly size = input<'default' | 'small'>('default');
  /** Si se traza al aparecer. */
  readonly animated = input(true);
  /** La columna de la matriz, para escalonar el trazado. */
  readonly column = input(0);
  /** La fila de la matriz, para escalonar el trazado. */
  readonly row = input(0);
  /** Si vuelve a trazarse cuando cambia de estado (no al aparecer). */
  readonly retrace = input(false);

  protected readonly labels = PROGRESS_LABELS;

  /** Ya cambió de estado alguna vez desde que apareció. */
  private readonly changed = signal(false);
  private seen = false;
  protected readonly traced = computed(() => this.animated() || (this.retrace() && this.changed()));

  constructor() {
    effect(() => {
      this.status();
      if (this.seen) this.changed.set(true);
      this.seen = true;
    });
  }
}

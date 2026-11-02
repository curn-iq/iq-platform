import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { InstrumentalDiff } from '../../../../domain/version-diff';

/** Lo que dice cada diferencia. */
const KIND_LABELS = { added: 'Agregado', removed: 'Quitado' } as const;

/**
 * Instrumental de la revisión: qué objetos se agregaron o se quitaron frente a la versión
 * publicada (cada uno por el nombre de su leyenda) y, debajo, todos los de la propuesta. Sin
 * cambios lo dice en una franja con visto; en una técnica nueva (`isNew`) solo lista los objetos.
 * Ver «Versiones por revisar (página)» en `DESIGN.md`.
 */
@Component({
  selector: 'app-review-instrumental',
  templateUrl: './review-instrumental.html',
  styleUrl: './review-instrumental.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewInstrumental {
  readonly diff = input.required<InstrumentalDiff>();
  /** No hay versión publicada con la que comparar. */
  readonly isNew = input(false);

  protected readonly labels = KIND_LABELS;
  protected readonly unchanged = computed(() => !this.isNew() && this.diff().changes.length === 0);
}

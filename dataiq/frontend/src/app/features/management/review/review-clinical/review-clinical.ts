import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ClinicalRow, FieldChange } from '../../../../domain/version-diff';

/** Lo que dice la marca de un campo cambiado. */
const CHANGE_TAGS: Readonly<Record<FieldChange, string>> = {
  added: '+ Agregado',
  modified: 'Modificado',
  removed: 'Quitado',
};

/**
 * Datos clínicos de la revisión: todos los campos de la versión, con lo publicado y lo propuesto
 * lado a lado y los cambiados marcados («+ Agregado», «Modificado» o «Quitado»). Sin versión
 * publicada (`publishedLabel` nulo) solo está la propuesta. Ver «Versiones por revisar (página)» en
 * `DESIGN.md`; la comparación sale de `domain/version-diff.ts`.
 */
@Component({
  selector: 'app-review-clinical',
  templateUrl: './review-clinical.html',
  styleUrl: './review-clinical.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewClinical {
  readonly rows = input.required<readonly ClinicalRow[]>();
  /** «Publicada · versión 1»; `null` si la propuesta es la versión 1. */
  readonly publishedLabel = input<string | null>(null);
  /** «Propuesta · versión 2». */
  readonly proposedLabel = input.required<string>();

  protected readonly tags = CHANGE_TAGS;
}

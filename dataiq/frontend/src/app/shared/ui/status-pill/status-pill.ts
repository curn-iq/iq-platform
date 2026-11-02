import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Los estados que tiene la pastilla hasta ahora; cada casilla que use otro lo suma. */
export type StatusPillKind = 'draft' | 'returned' | 'in_review';

/** Lo que dice cada pastilla. */
export const STATUS_PILL_LABELS: Readonly<Record<StatusPillKind, string>> = {
  draft: 'Borrador',
  returned: 'Devuelta',
  in_review: 'En revisión',
};

/**
 * Pastilla de estado de una versión, con su ícono, según «Mis borradores (página)» de
 * `DESIGN.md`: Borrador con anillo `filete-2`, En revisión en `marca-claro` y Devuelta en
 * `tinta` con texto blanco (nunca rojo).
 */
@Component({
  selector: 'app-status-pill',
  templateUrl: './status-pill.html',
  styleUrl: './status-pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-kind]': 'kind()' },
})
export class StatusPill {
  readonly kind = input.required<StatusPillKind>();

  protected readonly labels = STATUS_PILL_LABELS;
}

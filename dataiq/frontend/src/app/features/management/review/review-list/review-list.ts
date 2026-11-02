import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PendingReviews } from '../../../../core/pending-reviews/pending-reviews';
import { formatSent, queueSummary, type QueueKind } from '../../../../domain/review-queue';
import { Button } from '../../../../shared/ui/button/button';

/** Lo que dice el tipo de cada versión por revisar. */
const KIND_LABELS: Readonly<Record<QueueKind, string>> = {
  new_technique: 'Técnica nueva',
  edit: 'Edición de la publicada',
};

/**
 * Por revisar (`/gestion/revision`, `revision.html`): las versiones en revisión de otras personas,
 * la que lleva más esperando primero. Cada fila lleva a la revisión de esa versión. Las propias no
 * aparecen: un revisor o un admin publica lo suyo desde el editor.
 *
 * Los chips de las secciones que cambian y la nota del autor del mockup no están: los cambios se
 * calculan en la pantalla de revisión y la API no guarda la nota (Resuelto 18 de
 * `dataiq/docs/checklist-frontend.md`). Los textos, de Juan, 2026-11-02. Ver «Versiones por
 * revisar (página)» en `DESIGN.md`.
 */
@Component({
  selector: 'app-review-list',
  imports: [Button, RouterLink],
  templateUrl: './review-list.html',
  styleUrl: './review-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewList {
  private readonly pending = inject(PendingReviews);
  private readonly now = new Date();

  protected readonly loaded = this.pending.loaded;
  protected readonly failed = this.pending.failed;

  protected readonly summary = computed(() => queueSummary(this.pending.rows(), this.now));

  protected readonly rows = computed(() =>
    this.pending.rows().map((row) => ({
      ...row,
      sent: formatSent(row.sentAt, this.now),
      kindLabel: KIND_LABELS[row.kind],
    })),
  );

  constructor() {
    // Cada visita pide la lista de nuevo, para no mostrar lo que ya decidió otro revisor
    this.pending.refresh();
  }

  protected retry(): void {
    this.pending.refresh();
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PendingReviews } from '../../../../core/pending-reviews/pending-reviews';
import { SessionService } from '../../../../core/session/session.service';
import { hasFailed } from '../../../../data/resource-state';
import { VersionsRepository } from '../../../../data/versions.repository';
import { formatSent, queueSummary, type QueueKind } from '../../../../domain/review-queue';
import { formatReviewed, toReviewedRows } from '../../../../domain/reviewed';
import { Button } from '../../../../shared/ui/button/button';
import {
  SegmentedControl,
  type SegmentOption,
} from '../../../../shared/ui/segmented-control/segmented-control';
import { StatusPill } from '../../../../shared/ui/status-pill/status-pill';

/** Lo que dice el tipo de cada versión por revisar. */
const KIND_LABELS: Readonly<Record<QueueKind, string>> = {
  new_technique: 'Técnica nueva',
  edit: 'Edición de la publicada',
};

/** Las dos vistas de la pantalla. */
type ReviewView = 'pending' | 'reviewed';

/**
 * Por revisar (`/gestion/revision`, `revision.html`), en dos vistas que se eligen con un control
 * segmentado (no van en la URL, como el filtro de Mis borradores).
 *
 * **Por revisar:** las versiones en revisión de otras personas, la que lleva más esperando
 * primero. Cada fila lleva a la revisión de esa versión. Las propias no aparecen: un revisor o un
 * admin publica lo suyo desde el editor. Los chips de las secciones que cambian y la nota del
 * autor del mockup no están: los cambios se calculan en la pantalla de revisión y la API no guarda
 * la nota (Resuelto 18).
 *
 * **Revisadas por mí:** las que aprobé o devolví (`GET /versions?reviewed_by_me=true`), con el
 * resultado deducido del estado de la versión y, en las devueltas, la fecha y el motivo
 * (`domain/reviewed.ts`). Se pide con `include=rejections`: cada versión con sus devoluciones y
 * sin el contenido, que no se muestra. Se pide la primera vez que se abre la vista, no al cargar
 * la pantalla, porque crece con el tiempo.
 *
 * Los textos, de Juan, 2026-11-02 (Resueltos 57 y 58 de `dataiq/docs/checklist-frontend.md`). Ver
 * «Versiones por revisar (página)» en `DESIGN.md`.
 */
@Component({
  selector: 'app-review-list',
  imports: [Button, RouterLink, SegmentedControl, StatusPill],
  templateUrl: './review-list.html',
  styleUrl: './review-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewList {
  private readonly pending = inject(PendingReviews);
  private readonly session = inject(SessionService);
  private readonly now = new Date();

  // ---------- Por revisar ----------

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

  // ---------- Revisadas por mí ----------

  /** Se pide la primera vez que se abre la vista. */
  private readonly reviewedRequested = signal(false);
  private readonly reviewedResource = inject(VersionsRepository).listWithRejections(() =>
    this.reviewedRequested() ? { reviewedByMe: true } : undefined,
  );

  protected readonly reviewedLoaded = computed(() => this.reviewedResource.hasValue());
  protected readonly reviewedFailed = computed(() => hasFailed(this.reviewedResource));

  protected readonly reviewedRows = computed(() =>
    this.reviewedResource.hasValue()
      ? toReviewedRows(this.reviewedResource.value() ?? [], this.session.account()?.name ?? '').map(
          (row) => ({
            ...row,
            reviewed: formatReviewed(row.reviewedAt, this.now),
          }),
        )
      : [],
  );

  // ---------- Vistas ----------

  protected readonly view = signal<ReviewView>('pending');

  /** Cada vista con su cifra; la de las revisadas aparece cuando llega la lista. */
  protected readonly options = computed<SegmentOption[]>(() => {
    const pendingCount = this.pending.count();
    const reviewedCount = this.reviewedLoaded() ? this.reviewedRows().length : null;
    return [
      {
        key: 'pending',
        label: 'Por revisar',
        ...(pendingCount === null ? {} : { count: pendingCount }),
      },
      {
        key: 'reviewed',
        label: 'Revisadas por mí',
        ...(reviewedCount === null ? {} : { count: reviewedCount }),
      },
    ];
  });

  constructor() {
    // Cada visita pide la lista de nuevo, para no mostrar lo que ya decidió otro revisor
    this.pending.refresh();
  }

  protected chooseView(key: string): void {
    if (key === 'pending') {
      this.view.set('pending');
    } else if (key === 'reviewed') {
      this.view.set('reviewed');
      // Volver a abrirla la revisa de nuevo, pero sigue mostrando lo anterior hasta que llegue
      if (this.reviewedRequested()) this.reviewedResource.reload();
      else this.reviewedRequested.set(true);
    }
  }

  protected retry(): void {
    this.pending.refresh();
  }

  protected retryReviewed(): void {
    this.reviewedResource.reload();
  }
}

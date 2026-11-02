import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../core/session/session.service';
import { countDrafts, draftsSummary, filterDrafts, toDraftRows } from '../../../domain/drafts';
import type { DraftFilter } from '../../../domain/drafts';
import { formatDay, formatEdited } from '../../../domain/edited-date';
import { FIRST_EDITOR_STEP } from '../../../domain/editor-steps';
import { hasAtLeast } from '../../../domain/role';
import type { SectionKey } from '../../../domain/version-progress';
import { VersionsRepository } from '../../../data/versions.repository';
import { REDUCED_MOTION_QUERY, mediaQuery } from '../../../shared/media-query';
import { Button } from '../../../shared/ui/button/button';
import { EditPublished } from './edit-published/edit-published';
import { ProgressMark } from '../../../shared/ui/progress-mark/progress-mark';
import {
  SegmentedControl,
  type SegmentOption,
} from '../../../shared/ui/segmented-control/segmented-control';
import { StatusPill } from '../../../shared/ui/status-pill/status-pill';

/** Las secciones de una versión, en el orden de las columnas de la matriz. */
const SECTIONS: readonly { key: SectionKey; label: string }[] = [
  { key: 'clinical', label: 'Datos clínicos' },
  { key: 'instrumental', label: 'Instrumental' },
  { key: 'mayo', label: 'Mesa de Mayo' },
  { key: 'reserve', label: 'Mesa de reserva' },
];

/** Lo que dice cada filtro. */
const FILTER_LABELS: Readonly<Record<DraftFilter, string>> = {
  all: 'Todas',
  returned: 'Devueltas',
  draft: 'Borradores',
  in_review: 'En revisión',
};

/** Cuánto tardan en trazarse las marcas (la última columna de la última fila) antes de abrir la nota. */
const REVEAL_NOTES_AFTER_MS = 950;

/**
 * Mis borradores (`/gestion/borradores`, `borradores.html`): la matriz de avance de las
 * técnicas en curso de quien pregunta, con una columna por sección (datos clínicos,
 * instrumental y las dos mesas), el estado de cada una y, en la devuelta, el motivo de la
 * revisión. Se filtra por estado. Quien publica lo suyo (revisor o admin) no tiene devueltas ni
 * en revisión: la página no lleva filtros y lo dice en su línea de resumen. Sin nada en curso
 * queda la línea «Nada en curso.» y, si hay, lo último que se publicó.
 *
 * La lista no trae el contenido, así que cada versión se pide aparte para saber cómo va cada
 * sección (`VersionsRepository.getMany`). La regla del avance está en
 * `domain/version-progress.ts` (Resuelto 22 de `dataiq/docs/checklist-frontend.md`).
 */
@Component({
  selector: 'app-drafts',
  imports: [Button, EditPublished, ProgressMark, RouterLink, SegmentedControl, StatusPill],
  templateUrl: './drafts.html',
  styleUrl: './drafts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Drafts {
  private readonly session = inject(SessionService);
  private readonly repository = inject(VersionsRepository);
  private readonly reduced = mediaQuery(REDUCED_MOTION_QUERY);

  private readonly summaries = this.repository.list(() => ({
    mine: true,
    state: ['draft', 'in_review'],
  }));
  private readonly details = this.repository.getMany(() =>
    this.summaries.hasValue() ? this.summaries.value().map((summary) => summary.id) : undefined,
  );

  protected readonly sections = SECTIONS;
  protected readonly firstStep = FIRST_EDITOR_STEP;

  /** Revisor y admin publican lo suyo sin revisión (`docs/flujos.md`). */
  protected readonly publishesOwn = computed(() => {
    const role = this.session.role();
    return role !== null && hasAtLeast(role, 'reviewer');
  });

  /** Llegaron la lista y el contenido de cada versión. */
  protected readonly loaded = computed(() => this.details.hasValue());
  /** Algo no llegó por un error (el interceptor ya avisó): no se sabe cuántas hay. */
  protected readonly failed = computed(
    () =>
      !this.loaded() &&
      !this.summaries.isLoading() &&
      !this.details.isLoading() &&
      (this.summaries.error() !== undefined || this.details.error() !== undefined),
  );

  private readonly now = new Date();
  private readonly allRows = computed(() =>
    this.details.hasValue() ? toDraftRows(this.details.value() ?? []) : [],
  );

  protected readonly total = computed(() => this.allRows().length);
  protected readonly summary = computed(() => draftsSummary(this.allRows(), this.publishesOwn()));

  // ---------- Filtros ----------

  protected readonly filter = signal<DraftFilter>('all');
  /** Quien publica lo suyo no tiene devueltas ni en revisión: sin filtros. */
  protected readonly showFilters = computed(() => !this.publishesOwn() && this.total() > 0);
  protected readonly filterOptions = computed<SegmentOption[]>(() => {
    const counts = countDrafts(this.allRows());
    return (Object.keys(FILTER_LABELS) as DraftFilter[]).map((key) => ({
      key,
      label: FILTER_LABELS[key],
      count: counts[key],
    }));
  });

  protected chooseFilter(key: string): void {
    if (key in FILTER_LABELS) this.filter.set(key as DraftFilter);
  }

  /** Las filas del filtro elegido, con las fechas ya escritas. */
  protected readonly rows = computed(() =>
    filterDrafts(this.allRows(), this.showFilters() ? this.filter() : 'all').map((row) => ({
      ...row,
      edited: formatEdited(row.updatedAt, this.now),
      note: row.note && {
        reason: row.note.reason,
        date: formatDay(row.note.date, this.now),
      },
    })),
  );

  // ---------- Lo último que pasó ----------

  // Solo se pide si no hay nada en curso, que es cuando se muestra.
  private readonly publishedResource = this.repository.list(() =>
    this.loaded() && this.total() === 0 ? { mine: true, state: ['published'] } : undefined,
  );
  /** La versión publicada más reciente de quien pregunta (la API las entrega de la más reciente a la más vieja). */
  protected readonly lastPublished = computed(() =>
    this.publishedResource.hasValue() ? this.publishedResource.value()?.[0] : undefined,
  );

  // ---------- Motivo de la devolución ----------

  /** Las notas se abren cuando las marcas terminan de trazarse. */
  protected readonly notesRevealed = signal(false);
  private readonly collapsed = signal<ReadonlySet<string>>(new Set());

  protected noteOpen(id: string): boolean {
    return this.notesRevealed() && !this.collapsed().has(id);
  }

  protected toggleNote(id: string): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected retry(): void {
    if (this.summaries.error() !== undefined) this.summaries.reload();
    if (this.details.error() !== undefined) this.details.reload();
  }

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      // La primera vez que hay filas, la nota espera a que se tracen las marcas
      if (this.total() > 0 && timer === undefined) {
        timer = setTimeout(
          () => this.notesRevealed.set(true),
          this.reduced() ? 0 : REVEAL_NOTES_AFTER_MS,
        );
      }
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
}

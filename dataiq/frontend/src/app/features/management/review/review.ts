import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/session/session.service';
import { APP_NAME } from '../../../core/title/page-title.strategy';
import { hasFailed } from '../../../data/resource-state';
import { toEditorContent } from '../../../data/version-content';
import { VersionsRepository } from '../../../data/versions.repository';
import { formatDay } from '../../../domain/edited-date';
import { FIRST_EDITOR_STEP, VERSION_SECTIONS } from '../../../domain/editor-steps';
import { ZONE_NAMES } from '../../../domain/table';
import { isUuid } from '../../../domain/uuid';
import type { SectionKey } from '../../../domain/version-progress';
import { reviewDiff, sectionNotes } from '../../../domain/version-diff';
import { Button } from '../../../shared/ui/button/button';
import { NotFound } from '../../../shared/ui/not-found/not-found';
import { Tabs, type TabItem } from '../../../shared/ui/tabs/tabs';
import { ReviewClinical } from './review-clinical/review-clinical';
import { ReviewComments } from './review-comments';
import { ReviewDecision } from './review-decision/review-decision';
import { ReviewInstrumental } from './review-instrumental/review-instrumental';
import { ReviewTable } from './review-table/review-table';
import { SectionComments } from './section-comments/section-comments';

/** La petición terminó con un error y no hay un valor anterior que mostrar. */
/**
 * Revisión de una versión (`/gestion/revision/:versionId`, `revision.html`): la versión publicada y
 * la propuesta lado a lado, sección por sección, con los cambios calculados en el cliente
 * (`domain/version-diff.ts`, Resuelto 59 de `dataiq/docs/checklist-frontend.md`). Pide la propuesta
 * (`GET /versions/{id}`) y, si es una edición, la versión publicada de esa técnica
 * (`GET /versions?state=published&technique_id=…`): la API no entrega una diferencia, así que se
 * piden las dos completas. La sección abierta no va en la URL;
 * abre en la mesa de Mayo, como el mockup.
 *
 * Una versión que ya no está en revisión (la decidió otro revisor) o que es propia no se revisa: lo
 * dice, cada caso con su mensaje (la propia lleva al editor, desde donde se publica). El revisor comenta (`SectionComments`, `ReviewComments`) y decide (`ReviewDecision`, Resuelto
 * 60 de `dataiq/docs/checklist-frontend.md`). Ver «Versiones por revisar (página)» en `DESIGN.md`.
 */
@Component({
  selector: 'app-review',
  imports: [
    Button,
    NotFound,
    ReviewClinical,
    ReviewDecision,
    ReviewInstrumental,
    ReviewTable,
    RouterLink,
    SectionComments,
    Tabs,
  ],
  providers: [ReviewComments],
  templateUrl: './review.html',
  styleUrl: './review.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Review {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });
  private readonly session = inject(SessionService);
  private readonly repository = inject(VersionsRepository);
  private readonly title = inject(Title);
  private readonly now = new Date();

  protected readonly comments = inject(ReviewComments);
  protected readonly zones = ZONE_NAMES;

  /** El `id` de la URL; un texto que no puede ser un id no se pide a la API. */
  private readonly versionId = computed(() => {
    const id = this.params().get('versionId');
    return id !== null && isUuid(id) ? id : undefined;
  });

  // ---------- Qué se pide ----------

  private readonly proposalResource = this.repository.get(() => this.versionId());

  /** La versión que se revisa. */
  protected readonly proposal = computed(() =>
    this.proposalResource.hasValue() ? this.proposalResource.value() : undefined,
  );

  /** La URL no es de una versión o la API respondió 404. */
  protected readonly notFound = computed(() => {
    if (this.versionId() === undefined) return true;
    const error = this.proposalResource.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  /**
   * Se puede revisar: sigue en revisión (otro revisor no la decidió) y no es de quien la mira (lo
   * propio se publica desde el editor). `undefined` mientras no llega.
   */
  protected readonly reviewable = computed(() => {
    const proposal = this.proposal();
    if (!proposal) return undefined;
    return (
      proposal.summary.state === 'in_review' &&
      proposal.summary.created_by !== this.session.account()?.id
    );
  });

  /** Es de quien la mira y sigue en revisión: no se revisa, se publica desde el editor. */
  protected readonly own = computed(() => {
    const proposal = this.proposal();
    return (
      proposal?.summary.state === 'in_review' &&
      proposal.summary.created_by === this.session.account()?.id
    );
  });

  protected readonly firstStep = FIRST_EDITOR_STEP;

  /** Una edición tiene una publicada con la que comparar; la versión 1 no. */
  private readonly needsPublished = computed(
    () => this.reviewable() === true && (this.proposal()?.summary.number ?? 1) > 1,
  );

  /** La versión publicada de esta técnica (su resumen), si tiene una: la API filtra por técnica. */
  private readonly publishedList = this.repository.list(() => {
    const proposal = this.proposal();
    return proposal && this.needsPublished()
      ? { state: ['published'], techniqueId: proposal.summary.technique_id }
      : undefined;
  });

  private readonly publishedSummary = computed(() =>
    this.publishedList.hasValue() ? this.publishedList.value()?.[0] : undefined,
  );

  private readonly publishedResource = this.repository.get(() => this.publishedSummary()?.id);

  /** La versión publicada, si la técnica tiene una. */
  protected readonly published = computed(() =>
    this.publishedResource.hasValue() ? this.publishedResource.value() : undefined,
  );

  /** Llegó todo lo que hace falta para comparar. */
  private readonly ready = computed(() => {
    if (!this.proposal() || this.reviewable() !== true) return false;
    if (!this.needsPublished()) return true;
    if (!this.publishedList.hasValue()) return false;
    return this.publishedSummary() === undefined || this.publishedResource.hasValue();
  });

  /** Alguna petición falló (el interceptor ya avisó): no se sabe qué hay que revisar. */
  protected readonly failed = computed(() => {
    if (this.notFound()) return false;
    return (
      hasFailed(this.proposalResource) ||
      hasFailed(this.publishedList) ||
      hasFailed(this.publishedResource)
    );
  });

  // ---------- Lo que se ve ----------

  protected readonly diff = computed(() => {
    const proposal = this.proposal();
    if (!proposal || !this.ready()) return undefined;
    const published = this.published();
    return reviewDiff(
      published ? toEditorContent(published.content) : null,
      toEditorContent(proposal.content),
    );
  });

  /** «Publicada · versión 1»; `null` si no hay versión publicada con la que comparar. */
  protected readonly publishedLabel = computed(() => {
    const published = this.published();
    return published ? `Publicada · versión ${published.summary.number}` : null;
  });
  protected readonly proposedLabel = computed(
    () => `Propuesta · versión ${this.proposal()?.summary.number}`,
  );

  /** Quién la envió y cuándo (su última modificación: una versión en revisión no se edita). */
  protected readonly sentOn = computed(() => {
    const proposal = this.proposal();
    return proposal ? formatDay(new Date(proposal.summary.updated_at), this.now) : '';
  });

  // ---------- Pestañas ----------

  /** La sección abierta; abre en la mesa de Mayo. */
  protected readonly section = signal<SectionKey>('mayo');

  protected readonly tabs = computed<TabItem[]>(() => {
    const diff = this.diff();
    if (!diff) return [];
    const notes = sectionNotes(diff);
    return VERSION_SECTIONS.map(({ key, name }): TabItem => {
      const note = notes[key];
      return note.highlight
        ? { key, label: name, count: { value: note.changes, label: note.label } }
        : { key, label: name, note: note.label };
    });
  });

  protected chooseSection(key: string): void {
    if (VERSION_SECTIONS.some((section) => section.key === key)) {
      this.section.set(key as SectionKey);
    }
  }

  /** Otro revisor decidió primero: se vuelve a mirar la versión, que ya no está en revisión. */
  protected recheck(): void {
    this.proposalResource.reload();
  }

  protected retry(): void {
    if (hasFailed(this.proposalResource)) this.proposalResource.reload();
    if (hasFailed(this.publishedList)) this.publishedList.reload();
    if (hasFailed(this.publishedResource)) this.publishedResource.reload();
  }

  constructor() {
    // Los comentarios son de una versión: al revisar otra, empiezan de nuevo
    effect(() => {
      this.versionId();
      this.comments.clear();
    });
    effect(() => {
      const name = this.notFound() ? 'No encontrada' : this.proposal()?.summary.technique;
      if (name) this.title.setTitle(`${this.notFound() ? name : `Revisar ${name}`} · ${APP_NAME}`);
    });
  }
}

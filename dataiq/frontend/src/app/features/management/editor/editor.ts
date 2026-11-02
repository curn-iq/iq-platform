import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/session/session.service';
import { VersionsRepository } from '../../../data/versions.repository';
import { draftStatus } from '../../../domain/drafts';
import { findEditorStep, nextStep, previousStep, stepLabel } from '../../../domain/editor-steps';
import { hasAtLeast } from '../../../domain/role';
import { stepSummaries } from '../../../domain/step-summary';
import { isUuid } from '../../../domain/uuid';
import { versionProgress } from '../../../domain/version-progress';
import { Button } from '../../../shared/ui/button/button';
import { NotFound } from '../../../shared/ui/not-found/not-found';
import { StatusPill } from '../../../shared/ui/status-pill/status-pill';
import { ClinicalStep } from './clinical-step/clinical-step';
import { EditorState } from './editor-state';
import { EditorStepItem, EditorSteps } from './editor-steps/editor-steps';
import { InstrumentalStep } from './instrumental-step/instrumental-step';
import { MoreActions } from './more-actions/more-actions';
import { NewTechnique } from './new-technique/new-technique';
import { TableStep } from './table-step/table-step';

/**
 * El editor de técnicas (`/gestion/editor/nueva` y `/gestion/editor/:versionId/:paso`, `editor.html`).
 * Sin `versionId` es una técnica nueva: pide el nombre y la especialidad y, al crearla, lleva a su
 * primera versión. Con una versión muestra su cabecera (la ruta de vuelta, el nombre, la
 * especialidad y versión con su estado, el autoguardado, «Ver la versión publicada» y «Más
 * acciones»), la fila de cinco pasos con lo que falta en cada uno, la hoja del paso abierto y la
 * barra de abajo con Anterior y Siguiente. El paso abierto vive en la URL (`:paso`).
 *
 * El contenido de la versión y su autoguardado están en `EditorState`; el avance de cada paso sale de
 * él (`versionProgress`, Resuelto 22) y se actualiza con cada cambio. Una versión que no es un
 * borrador (en revisión) se abre en solo lectura. El contenido de cada paso llega en las casillas
 * siguientes de la fase 6 (`dataiq/docs/checklist-frontend.md`): hoy están los de los datos clínicos, el instrumental y las dos mesas; las demás hojas están vacías.
 *
 * Una versión que no existe, un `versionId` que no puede serlo (un id imposible ni se pide: la API
 * respondería 422) o un paso que no es uno de los cinco muestra «No encontrada». Si la API falla por
 * otra cosa, el interceptor ya avisó y queda la ruta de vuelta.
 */
@Component({
  selector: 'app-editor',
  imports: [
    Button,
    ClinicalStep,
    EditorSteps,
    InstrumentalStep,
    MoreActions,
    NewTechnique,
    NotFound,
    RouterLink,
    StatusPill,
    TableStep,
  ],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
  providers: [EditorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'warnBeforeLeaving($event)' },
})
export class Editor {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });
  private readonly session = inject(SessionService);
  protected readonly state = inject(EditorState);
  private readonly resource = inject(VersionsRepository).get(() => this.versionId());

  /** Es una técnica que aún no existe: la ruta no trae versión. */
  protected readonly isNew = computed(() => this.params().get('versionId') === null);

  /** El paso de la URL, o `undefined` si no es uno de los cinco. */
  protected readonly step = computed(() => findEditorStep(this.params().get('paso')));

  /** El `id` de la URL; un texto que no puede ser un id, o un paso que no existe, no se pide a la API. */
  protected readonly versionId = computed(() => {
    const id = this.params().get('versionId');
    return id !== null && isUuid(id) && this.step() !== undefined ? id : undefined;
  });

  protected readonly version = computed(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  /** La URL no es de una versión o de un paso, o la API respondió 404. */
  protected readonly notFound = computed(() => {
    if (this.isNew()) return false;
    if (this.versionId() === undefined) return true;
    const error = this.resource.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  /** El estado de la pastilla, si la versión está en curso. */
  protected readonly status = computed(() => {
    const version = this.version();
    return version ? draftStatus(version.summary.state, version.rejections) : null;
  });

  /** Revisor y admin publican lo suyo sin revisión: el último paso lo dice. */
  private readonly publishesOwn = computed(() => {
    const role = this.session.role();
    return role !== null && hasAtLeast(role, 'reviewer');
  });

  /** Los cinco pasos con su marca y lo que falta, a partir de lo que hay en pantalla. */
  protected readonly steps = computed<EditorStepItem[]>(() => {
    const content = this.state.content();
    if (!content) return [];
    const publishes = this.publishesOwn();
    return stepSummaries(versionProgress(content), publishes).map((summary) => ({
      ...summary,
      label: stepLabel(findEditorStep(summary.slug)!, publishes),
    }));
  });

  protected readonly stepNumber = computed(() =>
    this.steps().findIndex((item) => item.slug === this.step()?.slug),
  );
  protected readonly stepName = computed(() => this.steps()[this.stepNumber()]?.label);

  /** Los pasos vecinos, con su nombre, para la barra de abajo. */
  protected readonly previous = computed(() => this.neighbour(previousStep));
  protected readonly next = computed(() => this.neighbour(nextStep));

  /** La técnica tiene una versión publicada que ver: la versión 1 es la primera, así que no la tiene. */
  protected readonly hasPublished = computed(() => (this.version()?.summary.number ?? 1) > 1);

  /** Una versión en revisión no se edita: se dice por qué. */
  protected readonly inReview = computed(() => this.version()?.summary.state === 'in_review');

  constructor() {
    effect(() => {
      const version = this.version();
      if (version) this.state.load(version);
    });
  }

  /** Con algo sin guardar, el navegador pide confirmar antes de cerrar la pestaña. */
  protected warnBeforeLeaving(event: BeforeUnloadEvent): void {
    if (!this.state.hasUnsaved()) return;
    this.state.flush();
    event.preventDefault();
  }

  private neighbour(find: (slug: string) => { slug: string } | undefined) {
    const current = this.step();
    const neighbour = current ? find(current.slug) : undefined;
    return neighbour ? this.steps().find((item) => item.slug === neighbour.slug) : undefined;
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VersionsRepository } from '../../../data/versions.repository';
import { draftStatus } from '../../../domain/drafts';
import { isUuid } from '../../../domain/uuid';
import { NotFound } from '../../../shared/ui/not-found/not-found';
import { StatusPill } from '../../../shared/ui/status-pill/status-pill';
import { MoreActions } from './more-actions/more-actions';
import { NewTechnique } from './new-technique/new-technique';

/**
 * El editor de técnicas (`/gestion/editor/nueva` y `/gestion/editor/:versionId/:paso`, `editor.html`).
 * Sin `versionId` es una técnica nueva: pide el nombre y la especialidad y, al crearla, lleva a su
 * primera versión. Con una versión muestra su cabecera (la ruta de vuelta, el nombre, la
 * especialidad y versión con su estado, y «Más acciones»); el autoguardado y los cinco pasos llegan
 * en las casillas siguientes de la fase 6 (`dataiq/docs/checklist-frontend.md`).
 *
 * Una versión que no existe, o un `versionId` que no puede serlo (un id imposible ni se pide: la
 * API respondería 422), muestra «No encontrada». Si la API falla por otra cosa, el interceptor ya
 * avisó y queda la ruta de vuelta.
 */
@Component({
  selector: 'app-editor',
  imports: [MoreActions, NewTechnique, NotFound, RouterLink, StatusPill],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Editor {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });
  private readonly resource = inject(VersionsRepository).get(() => this.versionId());

  /** Es una técnica que aún no existe: la ruta no trae versión. */
  protected readonly isNew = computed(() => this.params().get('versionId') === null);

  /** El `id` de la URL; un texto que no puede ser un id no se pide a la API. */
  private readonly versionId = computed(() => {
    const id = this.params().get('versionId');
    return id !== null && isUuid(id) ? id : undefined;
  });

  protected readonly version = computed(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  /** La URL no es de una versión o la API respondió 404. */
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
}

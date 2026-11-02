import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NewTechnique } from './new-technique/new-technique';

/**
 * El editor de técnicas (`/gestion/editor/nueva` y `/gestion/editor/:versionId/:paso`, `editor.html`).
 * Sin `versionId` es una técnica nueva: pide el nombre y la especialidad y, al crearla, lleva a su
 * primera versión. Los cinco pasos de una versión llegan en las casillas siguientes de la fase 6
 * (`dataiq/docs/checklist-frontend.md`).
 */
@Component({
  selector: 'app-editor',
  imports: [NewTechnique],
  template: `
    @if (isNew()) {
      <app-new-technique />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Editor {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  /** Es una técnica que aún no existe: la ruta no trae versión. */
  protected readonly isNew = computed(() => this.params().get('versionId') === null);
}

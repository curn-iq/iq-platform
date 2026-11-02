import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { describeApiError } from '../../../core/http/error-message';
import { SessionService } from '../../../core/session/session.service';
import { TechniquesRepository } from '../../../data/techniques.repository';
import { VersionsRepository } from '../../../data/versions.repository';
import { editAction } from '../../../domain/edit-action';
import { FIRST_EDITOR_STEP } from '../../../domain/editor-steps';
import { hasAtLeast } from '../../../domain/role';

/** Lo que dice el botón si la API no explica el 409. */
const IN_PROGRESS_FALLBACK = 'La técnica ya tiene una versión en curso';

/**
 * El botón de editar del detalle de una técnica, según «Detalle de técnica (página)» de `DESIGN.md` y
 * Resuelto 24 de `dataiq/docs/checklist-frontend.md`: solo para un colaborador, un revisor o un admin.
 * Pide las versiones en curso (`GET /versions`, que a un colaborador le trae las suyas y a un revisor o
 * admin todas) y, según la de esta técnica, ofrece «Editar técnica» (crea una versión nueva,
 * `POST /techniques/{id}/versions`, y lleva al editor), «Continuar borrador», «Ver versión en revisión»
 * (los dos llevan al editor) o «En curso por …», sin acción, si es de otra persona.
 *
 * No se muestra hasta saber cuál es. Si la lista no llega (el interceptor ya avisó) ofrece «Editar
 * técnica»: el 409 de la API lo respalda. Un 409 al crear (la versión en curso es de otra persona, que un
 * colaborador no ve) se dice en el mismo botón, que desde entonces queda sin acción.
 */
@Component({
  selector: 'app-technique-edit-action',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './technique-edit-action.html',
  styleUrl: './technique-edit-action.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueEditAction {
  readonly techniqueId = input.required<string>();

  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly techniques = inject(TechniquesRepository);

  private readonly allowed = computed(() => {
    const role = this.session.role();
    return role !== null && hasAtLeast(role, 'contributor');
  });
  private readonly inProgress = inject(VersionsRepository).list(() =>
    this.allowed() ? { state: ['draft', 'in_review'] } : undefined,
  );

  /** Se sabe qué hay en curso, o no se pudo saber. */
  private readonly known = computed(
    () =>
      this.inProgress.hasValue() ||
      (!this.inProgress.isLoading() && this.inProgress.error() !== undefined),
  );

  /** Lo que ofrece el botón, o `undefined` si no corresponde o aún no se sabe. */
  protected readonly action = computed(() => {
    if (!this.allowed() || !this.known()) return undefined;
    const id = this.techniqueId();
    const versions = this.inProgress.hasValue() ? (this.inProgress.value() ?? []) : [];
    const version = versions.find((item) => item.technique_id === id);
    return editAction(version, this.session.account()?.id);
  });

  // Lo que se hizo con una técnica no vale para otra: el componente se reutiliza al cambiar de técnica
  private readonly creatingFor = signal<string | null>(null);
  private readonly conflictFor = signal<{ id: string; message: string } | null>(null);

  protected readonly creating = computed(() => this.creatingFor() === this.techniqueId());
  /** El texto del 409: la técnica ya tenía una versión en curso de otra persona. */
  protected readonly conflict = computed(() => {
    const conflict = this.conflictFor();
    return conflict?.id === this.techniqueId() ? conflict.message : null;
  });

  protected editorLink(versionId: string): string[] {
    return ['/gestion/editor', versionId, FIRST_EDITOR_STEP];
  }

  /** Crea la versión nueva y lleva a ella. Un segundo toque mientras va el primero no hace nada. */
  protected create(): void {
    const id = this.techniqueId();
    if (this.creating() || this.conflict() !== null) return;
    this.creatingFor.set(id);
    this.techniques.createVersion(id).subscribe({
      next: (version) => void this.router.navigate(this.editorLink(version.summary.id)),
      error: (error: unknown) => {
        this.creatingFor.set(null);
        // El interceptor no avisa el 409: lo dice el botón. Los demás errores ya los avisó él.
        if (error instanceof HttpErrorResponse && error.status === 409) {
          const message = describeApiError(409, error.error)?.join(' ') || IN_PROGRESS_FALLBACK;
          this.conflictFor.set({ id, message });
        }
      },
    });
  }
}

import { computed, inject, Injectable } from '@angular/core';
import { SessionService } from '../../core/session/session.service';
import { VersionsRepository } from '../../data/versions.repository';
import { hasAtLeast } from '../../domain/role';

/**
 * Las versiones en curso (borrador o en revisión) que la persona puede ver, pedidas una sola vez
 * (`GET /versions`: a un colaborador le trae las suyas y a un revisor o admin todas) para las dos
 * acciones del detalle que las necesitan: «Editar técnica» y «Archivar técnica». Lo provee
 * `TechniqueDetail`, así que cada visita al detalle la pide de nuevo. Sin rol de colaborador o más
 * no pide nada.
 */
@Injectable()
export class TechniqueInProgress {
  private readonly session = inject(SessionService);

  /** La cuenta es de colaborador o más: solo entonces hay acciones de gestión. */
  readonly allowed = computed(() => {
    const role = this.session.role();
    return role !== null && hasAtLeast(role, 'contributor');
  });

  private readonly resource = inject(VersionsRepository).list(() =>
    this.allowed() ? { state: ['draft', 'in_review'] } : undefined,
  );

  /** Se sabe qué hay en curso, o no se pudo saber (el interceptor ya avisó). */
  readonly known = computed(
    () =>
      this.resource.hasValue() ||
      (!this.resource.isLoading() && this.resource.error() !== undefined),
  );

  /** Las versiones en curso; vacío si no llegaron. */
  readonly versions = computed(() =>
    this.resource.hasValue() ? (this.resource.value() ?? []) : [],
  );
}

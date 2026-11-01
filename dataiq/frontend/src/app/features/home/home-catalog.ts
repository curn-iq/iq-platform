import { computed, inject, Injectable } from '@angular/core';
import type { TechniqueSummary } from '../../data/api/models';
import { TechniquesRepository } from '../../data/techniques.repository';
import { groupBySpecialty, type TechniqueGroup } from '../../domain/technique-groups';

/**
 * Las técnicas publicadas por especialidad que muestra el inicio: la ventana de
 * DataIQ del carril y «Técnicas por especialidad». Se pide una sola vez
 * (`GET /techniques` y `GET /specialties`, públicos) y las dos secciones la
 * comparten: se provee en `Home`, no en la raíz.
 */
@Injectable()
export class HomeCatalog {
  private readonly repository = inject(TechniquesRepository);
  private readonly techniques = this.repository.list();
  private readonly specialties = this.repository.specialties();

  /** Vacía hasta que llegan las dos respuestas, o si alguna falla (el interceptor ya avisó). */
  readonly groups = computed<TechniqueGroup<TechniqueSummary>[]>(() =>
    // `value()` lanza si la petición falló.
    this.techniques.hasValue() && this.specialties.hasValue()
      ? groupBySpecialty(
          (this.specialties.value() ?? []).map((specialty) => specialty.name),
          this.techniques.value() ?? [],
        )
      : [],
  );

  /** `true` mientras falta alguna respuesta. */
  readonly loading = computed(() => this.techniques.isLoading() || this.specialties.isLoading());
}

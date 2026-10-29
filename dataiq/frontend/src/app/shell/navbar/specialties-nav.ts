import { computed, inject, Injectable } from '@angular/core';
import { TechniquesRepository } from '../../data/techniques.repository';

/** Una especialidad con los nombres de sus técnicas publicadas. */
export interface SpecialtyEntry {
  readonly id: string;
  readonly name: string;
  readonly techniques: readonly string[];
}

/**
 * Las especialidades y sus técnicas para el desplegable «Especialidades». Se
 * crea la primera vez que se abre ese desplegable (no al cargar la página) y se
 * queda: las respuestas ya las guarda la caché HTTP del navegador.
 */
@Injectable({ providedIn: 'root' })
export class SpecialtiesNav {
  private readonly repository = inject(TechniquesRepository);
  private readonly specialties = this.repository.specialties();
  private readonly techniques = this.repository.list();

  /** `true` mientras alguna de las dos respuestas no llega. */
  readonly loading = computed(() => this.specialties.isLoading() || this.techniques.isLoading());

  /** Vacía hasta que llegan las dos respuestas (o si alguna falla: el interceptor ya avisó). */
  readonly entries = computed<SpecialtyEntry[]>(() => {
    // `value()` lanza si la petición falló: sin respuesta, la lista queda vacía.
    const techniques = (this.techniques.hasValue() ? this.techniques.value() : undefined) ?? [];
    const specialties = (this.specialties.hasValue() ? this.specialties.value() : undefined) ?? [];
    return specialties.map((specialty) => ({
      id: specialty.id,
      name: specialty.name,
      techniques: techniques.filter((t) => t.specialty === specialty.name).map((t) => t.name),
    }));
  });
}

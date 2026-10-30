import { computed, inject, Injectable } from '@angular/core';
import { TechniquesRepository } from '../../data/techniques.repository';
import { Specialties } from '../specialties';

/** Una especialidad con los nombres de sus técnicas publicadas. */
export interface SpecialtyEntry {
  readonly id: string;
  readonly name: string;
  readonly techniques: readonly string[];
}

/**
 * Las especialidades y sus técnicas para el desplegable «Especialidades». Las
 * especialidades son las del shell (`Specialties`); las técnicas se piden la
 * primera vez que se abre ese desplegable (no al cargar la página) y se quedan:
 * las respuestas ya las guarda la caché HTTP del navegador.
 */
@Injectable({ providedIn: 'root' })
export class SpecialtiesNav {
  private readonly specialties = inject(Specialties);
  private readonly techniques = inject(TechniquesRepository).list();

  /** `true` mientras alguna de las dos respuestas no llega. */
  readonly loading = computed(() => this.specialties.loading() || this.techniques.isLoading());

  /** Vacía hasta que llegan las dos respuestas (o si alguna falla: el interceptor ya avisó). */
  readonly entries = computed<SpecialtyEntry[]>(() => {
    // `value()` lanza si la petición falló: sin respuesta, la lista queda vacía.
    const techniques = (this.techniques.hasValue() ? this.techniques.value() : undefined) ?? [];
    return this.specialties.list().map((specialty) => ({
      id: specialty.id,
      name: specialty.name,
      techniques: techniques.filter((t) => t.specialty === specialty.name).map((t) => t.name),
    }));
  });

  /** Vuelve a pedir lo que falló la última vez (las especialidades, las técnicas o ambas). */
  retry(): void {
    this.specialties.retry();
    if (this.techniques.status() === 'error') this.techniques.reload();
  }
}

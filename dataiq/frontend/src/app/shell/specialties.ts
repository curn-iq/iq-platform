import { computed, inject, Injectable } from '@angular/core';
import type { Specialty } from '../data/api/models';
import { TechniquesRepository } from '../data/techniques.repository';

/**
 * Las especialidades que el shell lista en sus menús y en el pie, pedidas una
 * sola vez a `GET /specialties`. La API las da en el orden en que se muestran.
 */
@Injectable({ providedIn: 'root' })
export class Specialties {
  private readonly resource = inject(TechniquesRepository).specialties();

  /** Vacía hasta que llega la respuesta, o si falla (el interceptor ya avisó). */
  readonly list = computed<readonly Specialty[]>(() =>
    // `value()` lanza si la petición falló.
    this.resource.hasValue() ? (this.resource.value() ?? []) : [],
  );

  /** `true` mientras la respuesta no llega. */
  readonly loading = this.resource.isLoading;
}

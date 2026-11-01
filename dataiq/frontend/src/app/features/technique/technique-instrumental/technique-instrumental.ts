import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TechniqueInstruments } from '../../../data/api/models';
import { toPlaneSutures } from '../../../data/sutures';
import { instrumentalSheet } from '../../../domain/instrumental-sheet';

/**
 * La hoja de «Instrumental» (`tecnica.html`, «Detalle de técnica» en `DESIGN.md`): los
 * objetos de la técnica en tres columnas reguladas por filete y, debajo, los equipos
 * biomédicos, el equipo médico-quirúrgico y las suturas por plano. Todo sale de
 * `GET /techniques/{id}/instruments`, que pide cuenta (Resuelto 27): la página solo la
 * monta con sesión. Lo que la técnica no trae no se muestra.
 */
@Component({
  selector: 'app-technique-instrumental',
  templateUrl: './technique-instrumental.html',
  styleUrl: './technique-instrumental.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueInstrumental {
  readonly instruments = input.required<TechniqueInstruments>();

  protected readonly sheet = computed(() => {
    const { items, sutures, equipment, devices } = this.instruments();
    return instrumentalSheet({ items, sutures: toPlaneSutures(sutures), equipment, devices });
  });
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TechniquePublic } from '../../../data/api/models';
import { clinicalSheet } from '../../../domain/clinical-sheet';

/**
 * La hoja de «Datos clínicos» (`tecnica.html`, «Detalle de técnica» en `DESIGN.md`): a
 * la izquierda «Para qué sirve» en una tarjeta y las fichas (anestesia, ropa, posición
 * del paciente, código CUPS); a la derecha las indicaciones, las complicaciones y la
 * técnica quirúrgica; abajo, de dónde salen los datos. Es pública: todo sale de
 * `GET /techniques/{id}`. Lo que la fuente no trae no se muestra. Las suturas, los
 * equipos y el equipo médico-quirúrgico están en Instrumental (Resuelto 27).
 */
@Component({
  selector: 'app-technique-clinical',
  templateUrl: './technique-clinical.html',
  styleUrl: './technique-clinical.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueClinical {
  readonly technique = input.required<TechniquePublic>();

  protected readonly sheet = computed(() => clinicalSheet(this.technique()));
}

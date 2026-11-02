import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Instrument } from '../../data/api/models';
import type { TableItem } from '../../domain/mayo-table';

/**
 * La ficha del instrumento: su número del diagrama, su nombre y la descripción
 * que tiene en DataIQ. Un objeto de varios instrumentos (el mango con su hoja)
 * muestra la de cada uno. Ver «Ficha del instrumento» en `DESIGN.md`.
 */
@Component({
  selector: 'app-instrument-card',
  templateUrl: './instrument-card.html',
  styleUrl: './instrument-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentCard {
  readonly item = input.required<TableItem>();
  /** Los instrumentos del objeto, con su descripción de DataIQ. */
  readonly instruments = input<readonly Instrument[]>([]);
  /** La técnica en DataIQ. */
  readonly dataiqUrl = input.required<string>();
  readonly close = output<void>();
}

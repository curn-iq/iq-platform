import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import type { Instrument } from '../../data/api/models';
import { splitLead } from '../../domain/description';
import type { TableItem } from '../../domain/mayo-table';

/**
 * La ficha del instrumento: una nota sobre la escena, sin taparla. Lleva el
 * número del diagrama (el de la insignia de la pieza), el nombre y la primera
 * oración de la descripción que tiene en DataIQ; el resto, con «Ver más». Un objeto de varios instrumentos (el mango con su hoja)
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
  readonly close = output<void>();

  /** «Ver más» vuelve a plegarse al cambiar de pieza. */
  protected readonly expanded = linkedSignal({ source: this.item, computation: () => false });

  protected readonly texts = computed(() =>
    this.instruments().map(({ id, name, description }) => {
      const { lead, rest } = splitLead(description ?? '');
      return { id, name, text: this.expanded() && rest ? `${lead} ${rest}` : lead, more: !!rest };
    }),
  );

  protected readonly hasMore = computed(() => this.texts().some((text) => text.more));
}

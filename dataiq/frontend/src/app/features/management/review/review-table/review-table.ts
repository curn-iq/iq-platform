import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ZoneDiff, ZoneState } from '../../../../domain/version-diff';
import { TableDiagram } from '../../../../shared/table-diagram/table-diagram';
import { TableMarks } from './table-marks';

/**
 * Una mesa de la revisión (la de Mayo o la de reserva): la publicada y la propuesta lado a lado, y
 * al lado la lista de cambios. Señalar un cambio, con el puntero o el teclado, levanta su pieza en
 * las dos mesas y atenúa las demás; también al revés, señalando una pieza. Las marcas encima del
 * diagrama dicen de dónde salió cada pieza y adónde llegó (`app-table-marks`). Sin cambios, o en una
 * técnica nueva (`isNew`), solo está la propuesta. Ver «Versiones por revisar (página)» en
 * `DESIGN.md`; los cambios salen de `domain/version-diff.ts`.
 */
@Component({
  selector: 'app-review-table',
  imports: [TableDiagram, TableMarks],
  templateUrl: './review-table.html',
  styleUrl: './review-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewTable {
  readonly diff = input.required<ZoneDiff>();
  /** «Mesa de Mayo» o «Mesa de reserva», como la nombra la API. */
  readonly zoneName = input.required<string>();
  /** «Publicada · versión 1». */
  readonly publishedLabel = input.required<string>();
  /** «Propuesta · versión 2». */
  readonly proposedLabel = input.required<string>();
  /** No hay versión publicada con la que comparar. */
  readonly isNew = input(false);

  /** El número señalado en cualquiera de las dos mesas o de la lista. */
  protected readonly active = signal<number | null>(null);

  protected readonly changes = computed(() => this.diff().changes);
  protected readonly unchanged = computed(() => !this.isNew() && this.changes().length === 0);
  /** Solo la propuesta: no hay con qué comparar o nada cambió. */
  protected readonly single = computed(() => this.isNew() || this.unchanged());

  /**
   * El recuadro de una mesa que no se dibuja: «Sin mesa de Mayo.» o «Mesa de Mayo sin arreglo
   * disponible.» (Resuelto 37 de `dataiq/docs/checklist-frontend.md`).
   */
  protected blank(state: ZoneState): string {
    const name = this.zoneName();
    return state === 'not_carried' ? `Sin m${name.slice(1)}.` : `${name} sin arreglo disponible.`;
  }

  protected point(number: number | null): void {
    this.active.set(number);
  }
}

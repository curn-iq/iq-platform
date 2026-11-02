import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { EditorCell } from '../../../../domain/editor-content';
import type { CommentTarget } from '../../../../domain/review-comments';
import type { TableChange, ZoneDiff, ZoneState } from '../../../../domain/version-diff';
import { TableDiagram } from '../../../../shared/table-diagram/table-diagram';
import { CommentButton } from '../comment-button/comment-button';
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
  imports: [CommentButton, TableDiagram, TableMarks],
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
  /** Cuál de las dos mesas es: de ella son los comentarios. */
  readonly section = input.required<'mayo' | 'reserve'>();
  /** Los números de los objetos que ya tienen un comentario: sus celdas se marcan en la propuesta. */
  readonly commented = input<readonly number[]>([]);
  /** Se quiere comentar un objeto de la mesa, o la mesa entera. */
  readonly commentRequested = output<CommentTarget>();

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

  /** Las celdas de los objetos de la propuesta que ya tienen un comentario. */
  protected readonly commentedCells = computed<EditorCell[]>(() => {
    const numbers = new Set(this.commented());
    return (this.diff().proposed.table?.items ?? [])
      .filter((item) => item.legendNumber !== null && numbers.has(item.legendNumber))
      .flatMap((item) => item.cells.map(({ row, column }) => ({ row, column })));
  });

  protected point(number: number | null): void {
    this.active.set(number);
  }

  /** Comentar un cambio: el objeto, o la mesa entera si el cambio es de la mesa (tamaño o si se lleva). */
  protected commentChange(change: TableChange): void {
    this.commentRequested.emit(
      change.kind === 'resized'
        ? { kind: 'section', section: this.section() }
        : { kind: 'object', section: this.section(), number: change.number, name: change.name },
    );
  }

  /** Tocar una pieza de la propuesta (o Intro con el foco en ella) comenta ese objeto. */
  protected commentPiece(event: Event): void {
    const piece = (event.target as Element).closest('.piece[data-n]');
    if (!piece) return;
    const number = Number(piece.getAttribute('data-n'));
    const item = this.diff().proposed.table?.items.find(
      (candidate) => candidate.legendNumber === number,
    );
    if (item) {
      this.commentRequested.emit({
        kind: 'object',
        section: this.section(),
        number,
        name: item.name,
      });
    }
  }
}

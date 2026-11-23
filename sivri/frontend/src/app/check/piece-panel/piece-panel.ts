import { Component, computed, input, output } from '@angular/core';
import { GROUP_LABELS, type Piece } from '../../domain/frame-reading';
import { ArrowLink } from '../../ui/arrow-link';

/**
 * Una pieza que hay que corregir, de a una: su nombre grande, su número en el diagrama de IQ y
 * dónde va. «Resultado» vuelve a la lista y «Siguiente» sigue con la próxima pieza por corregir
 * (por mover, luego las que faltan y luego las que sobran).
 */
@Component({
  selector: 'app-piece-panel',
  imports: [ArrowLink],
  templateUrl: './piece-panel.html',
  styleUrl: './piece-panel.scss',
})
export class PiecePanel {
  readonly piece = input.required<Piece>();
  /** Su lugar en lo que hay que corregir, desde 0. */
  readonly index = input.required<number>();
  readonly total = input.required<number>();
  /** La que sigue, si hay. */
  readonly next = input<Piece | null>(null);
  readonly back = output<void>();
  readonly advance = output<void>();

  protected readonly eyebrow = computed(
    () => `${GROUP_LABELS[this.piece().kind]} · ${this.index() + 1} de ${this.total()}`,
  );

  /** Lo que se le dice: la frase del backend y, si va a otro lugar, qué hacer con la flecha. */
  protected readonly instruction = computed(() => {
    const { sentence, kind, box, move } = this.piece();
    const extra =
      kind === 'move' && box && move
        ? ' Muévela en la dirección de la flecha.'
        : kind === 'extra'
          ? ' Retírala de la mesa.'
          : '';
    return `${sentence ?? ''}${extra}`.trim();
  });
}

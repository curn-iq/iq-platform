import { Component, computed, input, output } from '@angular/core';
import {
  GROUP_LABELS,
  headline,
  isClose,
  joinNames,
  piecesCount,
  summaryOf,
  type FrameReading,
  type Piece,
} from '../../domain/frame-reading';
import { referenceTableUrl } from '../../links';
import { AppButton } from '../../ui/button';
import { ArrowLink } from '../../ui/arrow-link';
import { Group } from '../../ui/group';

/** El porcentaje como se escribe en español: «80 %». */
const percentFormat = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 0 });

/** Una fila de «Por mover», «Falta» o «Sobra»: la pieza y a qué lleva su enlace. */
interface Row {
  readonly piece: Piece;
  /** Su lugar en lo que hay que corregir (por mover, luego falta, luego sobra). */
  readonly index: number;
  readonly link: string;
}

/**
 * El resultado fijado: cuántas piezas están en su lugar y, por grupos, lo que hay que corregir.
 * Con dos técnicas muy cerca no se elige una por el estudiante: se muestran las dos y «Ver dónde
 * va» queda desactivado hasta que una gane (`design/README.md`, «SIVRI: celular y computador»).
 */
@Component({
  selector: 'app-result-panel',
  imports: [AppButton, ArrowLink, Group],
  templateUrl: './result-panel.html',
  styleUrl: './result-panel.scss',
})
export class ResultPanel {
  readonly reading = input.required<FrameReading>();
  /** Abre la pieza número `index` de lo que hay que corregir. */
  readonly openPiece = output<number>();
  /** «Revisar de nuevo». */
  readonly again = output<void>();

  protected readonly close = computed(() => isClose(this.reading()));
  /** La técnica que más se parece: de ella son los grupos. */
  protected readonly top = computed(() => this.reading().techniques[0]);

  protected readonly eyebrow = computed(() =>
    this.close()
      ? 'Dos técnicas se parecen casi igual'
      : `${this.top().name} · la técnica la reconoció la cámara`,
  );
  protected readonly title = computed(() =>
    this.close() ? 'Puede ser una de dos.' : headline(this.top()),
  );
  protected readonly lead = computed(() =>
    this.close()
      ? 'Acomoda la mesa como la publicó el programa de IQ y revísala de nuevo: así SIVRI sabe cuál es.'
      : summaryOf(this.top()),
  );

  /** Las dos técnicas más parecidas, cada una con su porcentaje. */
  protected readonly candidates = computed(() =>
    this.reading().techniques.map((technique) => ({
      id: technique.techniqueId,
      name: technique.name,
      detail: `${percentFormat.format(technique.percent / 100)} · ${technique.inPlace} de ${technique.expected} en su lugar`,
    })),
  );

  /** Los tres grupos de lo que hay que corregir, con el lugar de cada pieza en el recorrido. */
  protected readonly groups = computed(() => {
    const top = this.top();
    const toMove = top.move;
    const missing = top.missing;
    const extra = top.extra;
    const rows = (pieces: readonly Piece[], offset: number, link: string): Row[] =>
      pieces.map((piece, i) => ({ piece, index: offset + i, link }));
    return [
      { kind: 'move' as const, rows: rows(toMove, 0, 'Ver dónde va') },
      { kind: 'missing' as const, rows: rows(missing, toMove.length, 'Ver dónde va') },
      { kind: 'extra' as const, rows: rows(extra, toMove.length + missing.length, 'Ver cuál es') },
    ]
      .filter((group) => group.rows.length > 0)
      .map((group) => ({
        ...group,
        name: GROUP_LABELS[group.kind],
        note: piecesCount(group.rows.length),
      }));
  });

  protected readonly placedNames = computed(
    () => joinNames(this.top().placed.map((p) => p.label)) + '.',
  );
  protected readonly placedNote = computed(() => piecesCount(this.top().placed.length));
  protected readonly hasPlaced = computed(() => this.top().placed.length > 0);
  protected readonly referenceUrl = computed(() => referenceTableUrl(this.top().techniqueId));
}

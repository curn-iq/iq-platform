import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ChatMessage } from '../domain/chat';
import type { TableItem } from '../domain/mayo-table';
import { PieceList } from './piece-list';
import { RichText } from './rich-text';
import { Typing } from './typing';

/**
 * El panel del chat: su cabeza y la conversación, con las opciones de cada respuesta
 * (cuando termina de escribirse), el aviso si el chat no respondió y
 * las sugerencias para empezar. En escritorio es el panel lateral del banco de
 * trabajo; en celular es el historial, que entra desde la izquierda («Chat de
 * SIMIQ3D» en `DESIGN.md`).
 */
@Component({
  selector: 'app-chat-history',
  templateUrl: './chat-history.html',
  imports: [PieceList, RichText, Typing],
  styleUrl: './chat-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'complementary', 'aria-label': 'Chat de SIMIQ3D' },
})
export class ChatHistory {
  readonly messages = input<readonly ChatMessage[]>([]);
  /** Se espera la respuesta: los tres puntos de SIMIQ3D. */
  readonly pending = input(false);
  /** Por qué el chat no respondió; `null` si respondió. */
  readonly notice = input<{ title: string; line: string } | null>(null);
  /** Preguntas para empezar; se van con la primera pregunta. */
  readonly suggestions = input<readonly string[]>([]);
  /** Las iniciales de la persona, para su distintivo. */
  readonly initials = input('');
  /** El historial se ve (en celular, el panel está subido): la conversación se coloca al abrirse. */
  readonly active = input(true);
  /** La técnica abierta y su mesa: la lista de «Instrumental» señala sus piezas. */
  readonly openTechnique = input<string | undefined>();
  readonly items = input<readonly TableItem[]>([]);
  readonly ask = output<string>();
  readonly choose = output<string>();
  /** Cerrar el historial (en celular). */
  readonly close = output<void>();

  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  /**
   * Bajo cada respuesta que escribió el modelo: de dónde sale cada cosa y que
   * puede equivocarse (pautas 1 y 2 de Microsoft HAX: qué hace y qué tan bien).
   */
  protected readonly sources =
    'Mesa y técnica: DataIQ. Lo demás lo explica un modelo de IA y puede equivocarse.';

  constructor() {
    // La conversación se coloca sola: lo último se ve, pero una respuesta larga empieza en su
    // primera letra, no en su final (también al subir el panel en celular).
    afterRenderEffect({
      // Lee la medida de la conversación y dónde empieza lo último
      earlyRead: () => {
        this.messages();
        this.pending();
        this.active();
        const list = this.list().nativeElement;
        const last = list.lastElementChild as HTMLElement | null;
        if (!last) return null;
        const top =
          last.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
        return Math.min(list.scrollHeight - list.clientHeight, top - 12);
      },
      // Y solo después la mueve, sin mezclar lecturas y escrituras
      write: (target) => {
        const scrollTop = target();
        if (scrollTop !== null) this.list().nativeElement.scrollTop = scrollTop;
      },
    });
  }

  /** La lista numerada de la mesa, si la respuesta es su instrumental y esa mesa está abierta. */
  protected listFor(message: ChatMessage): readonly TableItem[] {
    return message.from === 'simiq3d' &&
      message.reply.action === 'list_instruments' &&
      message.reply.technique_id === this.openTechnique()
      ? this.items()
      : [];
  }
}

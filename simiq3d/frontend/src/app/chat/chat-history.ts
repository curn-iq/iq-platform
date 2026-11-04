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
import { actionChip, ActionChip, ChatMessage } from '../domain/chat';
import type { TableItem } from '../domain/mayo-table';
import { PieceList } from './piece-list';
import { RichText } from './rich-text';
import { Typing } from './typing';

/** Los nombres de DataIQ, por id, para el chip de cada respuesta. */
export interface ChatNames {
  techniques: ReadonlyMap<string, string>;
  instruments: ReadonlyMap<string, string>;
}

/**
 * El panel del chat: su cabeza y la conversación, con el chip de lo que hizo
 * cada respuesta en el visor, sus opciones, el aviso si el chat no respondió y
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
  readonly names = input<ChatNames>({ techniques: new Map(), instruments: new Map() });
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

  protected readonly chips = computed(() => {
    const { techniques, instruments } = this.names();
    const chips = new Map<number, ActionChip | null>();
    for (const message of this.messages()) {
      if (message.from !== 'simiq3d') continue;
      const reply = message.reply;
      chips.set(
        message.id,
        actionChip(reply, {
          technique: reply.technique_id ? techniques.get(reply.technique_id) : undefined,
          instrument: reply.instrument_id ? instruments.get(reply.instrument_id) : undefined,
        }),
      );
    }
    return chips;
  });

  constructor() {
    // La conversación baja sola hasta lo último
    afterRenderEffect(() => {
      this.messages();
      this.pending();
      const list = this.list().nativeElement;
      list.scrollTop = list.scrollHeight;
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

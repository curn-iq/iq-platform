import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Simiq3dRepository } from '../data/simiq3d.repository';
import {
  ChatMessage,
  ChatReply,
  ChatStreamEvent,
  ChatTurn,
  sceneFor,
  SceneChange,
} from '../domain/chat';

/** El aviso cuando el chat no responde («Chat no disponible» en `DESIGN.md`). */
export interface ChatNotice {
  title: string;
  line: string;
}

const STILL_WORKS = 'La mesa, la leyenda y la ficha de cada instrumento siguen funcionando.';

/** Cuántas preguntas anteriores van con cada pregunta: el backend acepta hasta tres. */
const PREVIOUS_TURNS = 3;

/**
 * La conversación con el chat. Vive aparte de la pantalla porque al abrir otra
 * técnica desde la bienvenida la pantalla se vuelve a crear, y la conversación
 * sigue. Guarda la escena que pidió la última respuesta hasta que la pantalla la
 * muestre (`takeScene`): si hay que abrir otra técnica, primero tiene que llegar
 * su mesa.
 */
@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly simiq3d = inject(Simiq3dRepository);
  private nextId = 1;
  /** Las últimas preguntas respondidas, con lo que entendió el chat de cada una. */
  private turns: readonly ChatTurn[] = [];

  readonly messages = signal<readonly ChatMessage[]>([]);
  /** Se espera la respuesta, hasta que termina de escribirse: no se envía otra pregunta. */
  readonly pending = signal(false);
  /** Todavía no llega ni una frase: los tres puntos de SIMIQ3D. */
  readonly waiting = signal(false);
  /** Por qué el chat no respondió la última vez; se quita con la siguiente respuesta. */
  readonly notice = signal<ChatNotice | null>(null);
  /** Lo que la última respuesta pide cambiar en el visor, mientras no se aplique. */
  readonly scene = signal<SceneChange | null>(null);

  /**
   * Envía una pregunta con la técnica abierta. La respuesta llega a medida que se escribe:
   * con `start` aparece el mensaje y el visor cambia, cada `text` agrega una parte y `end`
   * deja la respuesta completa. Nunca se rechaza: los errores son el aviso.
   */
  async ask(question: string, techniqueId: string | null): Promise<void> {
    const text = question.trim();
    if (!text || this.pending()) return;
    this.push({ id: this.nextId++, from: 'person', text });
    this.pending.set(true);
    this.waiting.set(true);
    let id: number | null = null;
    let final: ChatReply | null = null;
    try {
      await new Promise<void>((resolve, reject) => {
        this.simiq3d.ask(text, techniqueId, this.turns).subscribe({
          next: (event) => {
            if (event.type === 'text') {
              if (id !== null) this.write(id, (reply) => reply.reply + event.text);
              if (event.text.trim()) this.waiting.set(false);
              return;
            }
            const reply = withoutType(event);
            if (event.type === 'start') {
              id = this.nextId++;
              this.push({ id, from: 'simiq3d', reply });
              this.notice.set(null);
              this.scene.set(sceneFor(reply));
              return;
            }
            final = reply;
            if (id === null) {
              id = this.nextId++;
              this.push({ id, from: 'simiq3d', reply });
              this.scene.set(sceneFor(reply));
            } else {
              this.write(id, () => reply.reply, reply);
            }
          },
          error: reject,
          complete: resolve,
        });
      });
      if (final === null) throw new Error('La respuesta se cortó');
      const done: ChatReply = final;
      const turn = { question: text, requests: done.requests ?? [], reply: done.reply };
      this.turns = [...this.turns, turn].slice(-PREVIOUS_TURNS);
      this.notice.set(null);
    } catch (error) {
      // Si ya se veía parte de la respuesta, queda, y el aviso dice que se cortó.
      this.notice.set(id === null ? noticeFor(error) : CUT);
    } finally {
      this.pending.set(false);
      this.waiting.set(false);
    }
  }

  /** La pantalla ya mostró la escena que se pidió. */
  takeScene(): void {
    this.scene.set(null);
  }

  private push(message: ChatMessage): void {
    this.messages.update((messages) => [...messages, message]);
  }

  /** Cambia el texto de una respuesta (y, al final, el resto de sus datos). */
  private write(id: number, text: (reply: ChatReply) => string, whole?: ChatReply): void {
    this.messages.update((messages) =>
      messages.map((m) =>
        m.id === id && m.from === 'simiq3d'
          ? { ...m, reply: { ...(whole ?? m.reply), reply: text(m.reply) } }
          : m,
      ),
    );
  }
}

/** La respuesta del evento, sin su tipo. */
function withoutType(event: Exclude<ChatStreamEvent, { type: 'text' }>): ChatReply {
  const { type: _type, ...reply } = event;
  return reply;
}

const CUT: ChatNotice = {
  title: 'La respuesta se cortó antes de terminar.',
  line: 'Lo que se alcanzó a escribir queda arriba. Se puede volver a preguntar.',
};

/** Qué decir según por qué no respondió el chat. */
function noticeFor(error: unknown): ChatNotice {
  if (!(error instanceof HttpErrorResponse) || error.status === 0) {
    return { title: 'No hay conexión con el servidor.', line: STILL_WORKS };
  }
  // La respuesta del chat se pide como texto (para leerla a medida que llega): el error
  // también llega como texto.
  const body = typeof error.error === 'string' ? parsed(error.error) : error.error;
  const detail = typeof body?.detail === 'string' ? body.detail : null;
  if (error.status === 503 && detail === 'El chat no está disponible') {
    return { title: 'El chat no está disponible en este momento.', line: STILL_WORKS };
  }
  // El tope de preguntas seguidas (429) y DataIQ sin responder (503) traen su texto
  if (detail && (error.status === 429 || error.status === 503)) {
    return { title: detail.endsWith('.') ? detail : `${detail}.`, line: STILL_WORKS };
  }
  return {
    title: 'El chat no pudo responder. Intentar de nuevo en un momento.',
    line: STILL_WORKS,
  };
}

function parsed(text: string): { detail?: unknown } | null {
  try {
    return JSON.parse(text) as { detail?: unknown };
  } catch {
    return null;
  }
}

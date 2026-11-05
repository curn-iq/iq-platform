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

/** Cada cuánto aparece una parte nueva del texto y cuánto de lo pendiente se suelta en cada una. */
const TYPING_TICK_MS = 20;
const CATCH_UP_TICKS = 24;

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
  /** Lo que llegó del servidor y aún no se ve: el texto sale a paso parejo, no por frases. */
  private buffer = '';
  private typing: Promise<void> = Promise.resolve();
  private typingActive = false;

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
              if (id !== null) this.type(id, event.text);
              return;
            }
            const reply = withoutType(event);
            if (event.type === 'start') {
              id = this.nextId++;
              this.push({ id, from: 'simiq3d', reply, writing: true });
              this.notice.set(null);
              this.scene.set(sceneFor(reply));
              return;
            }
            final = reply;
            if (id === null) {
              id = this.nextId++;
              this.push({ id, from: 'simiq3d', reply });
              this.scene.set(sceneFor(reply));
            }
          },
          error: reject,
          complete: resolve,
        });
      });
      await this.typing;
      if (final === null) throw new Error('La respuesta se cortó');
      const done: ChatReply = final;
      // El texto ya se escribió entero: ahora sí llegan las opciones y el resto de los datos
      if (id !== null) this.finish(id, done);
      const turn = { question: text, requests: done.requests ?? [], reply: done.reply };
      this.turns = [...this.turns, turn].slice(-PREVIOUS_TURNS);
      this.notice.set(null);
    } catch (error) {
      // Si ya se veía parte de la respuesta, queda, y el aviso dice que se cortó.
      await this.typing;
      if (id !== null) this.write(id, (reply) => reply.reply, undefined, false);
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

  /** Deja la respuesta completa, con sus opciones y datos finales. */
  private finish(id: number, whole: ChatReply): void {
    this.write(id, () => whole.reply, whole, false);
  }

  /** Cambia el texto de una respuesta (y, al final, el resto de sus datos). */
  private write(
    id: number,
    text: (reply: ChatReply) => string,
    whole?: ChatReply,
    writing = true,
  ): void {
    this.messages.update((messages) =>
      messages.map((m) =>
        m.id === id && m.from === 'simiq3d'
          ? { ...m, writing, reply: { ...(whole ?? m.reply), reply: text(m.reply) } }
          : m,
      ),
    );
  }

  /** Recibe una parte del texto y la va soltando a paso parejo, sin saltos. */
  private type(id: number, text: string): void {
    this.buffer += text;
    if (this.typingActive) return;
    this.typingActive = true;
    this.typing = this.drain(id).finally(() => (this.typingActive = false));
  }

  private async drain(id: number): Promise<void> {
    while (this.buffer) {
      // Cuanto más hay por mostrar, más se suelta por vez, para no quedarse atrás
      const size = Math.max(1, Math.ceil(this.buffer.length / CATCH_UP_TICKS));
      const chunk = this.buffer.slice(0, this.safeEnd(id, size));
      this.buffer = this.buffer.slice(chunk.length);
      this.write(id, (reply) => reply.reply + chunk);
      if (chunk.trim()) this.waiting.set(false);
      await new Promise((resolve) => setTimeout(resolve, TYPING_TICK_MS));
    }
    this.buffer = '';
  }

  /** Hasta dónde cortar sin dejar a medias una negrita (`**así**`) a la vista. */
  private safeEnd(id: number, size: number): number {
    const shown = this.messages().find((m) => m.id === id);
    const before = shown?.from === 'simiq3d' ? shown.reply.reply : '';
    let end = size;
    if (this.buffer[end - 1] === '*' && this.buffer[end] === '*') end++;
    const open = ((before + this.buffer.slice(0, end)).match(/\*\*/g) ?? []).length % 2 === 1;
    if (open) {
      const close = this.buffer.indexOf('**', end);
      if (close >= 0) end = close + 2;
    }
    return end;
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

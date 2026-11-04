import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Simiq3dRepository } from '../data/simiq3d.repository';
import { ChatMessage, ChatTurn, sceneFor, SceneChange } from '../domain/chat';

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
  /** Se espera la respuesta: no se envía otra pregunta. */
  readonly pending = signal(false);
  /** Por qué el chat no respondió la última vez; se quita con la siguiente respuesta. */
  readonly notice = signal<ChatNotice | null>(null);
  /** Lo que la última respuesta pide cambiar en el visor, mientras no se aplique. */
  readonly scene = signal<SceneChange | null>(null);

  /** Envía una pregunta con la técnica abierta. Nunca se rechaza: los errores son el aviso. */
  async ask(question: string, techniqueId: string | null): Promise<void> {
    const text = question.trim();
    if (!text || this.pending()) return;
    this.push({ id: this.nextId++, from: 'person', text });
    this.pending.set(true);
    try {
      const reply = await firstValueFrom(this.simiq3d.ask(text, techniqueId, this.turns));
      this.push({ id: this.nextId++, from: 'simiq3d', reply });
      const turn = { question: text, requests: reply.requests ?? [], reply: reply.reply };
      this.turns = [...this.turns, turn].slice(-PREVIOUS_TURNS);
      this.notice.set(null);
      this.scene.set(sceneFor(reply));
    } catch (error) {
      this.notice.set(noticeFor(error));
    } finally {
      this.pending.set(false);
    }
  }

  /** La pantalla ya mostró la escena que se pidió. */
  takeScene(): void {
    this.scene.set(null);
  }

  private push(message: ChatMessage): void {
    this.messages.update((messages) => [...messages, message]);
  }
}

/** Qué decir según por qué no respondió el chat. */
function noticeFor(error: unknown): ChatNotice {
  if (!(error instanceof HttpErrorResponse) || error.status === 0) {
    return { title: 'No hay conexión con el servidor.', line: STILL_WORKS };
  }
  const detail = typeof error.error?.detail === 'string' ? error.error.detail : null;
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

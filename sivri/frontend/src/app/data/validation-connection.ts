import { HttpErrorResponse } from '@angular/common/http';
import {
  CLOSE_CODES,
  type FrameErrorMessage,
  parseServerMessage,
  type ResultMessage,
  tokenMessage,
} from './socket-messages';

/** Lo que se usa de un `WebSocket`; así las pruebas ponen uno de mentira. */
export interface SocketLike {
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  send(data: string | Blob): void;
  close(code?: number, reason?: string): void;
}

export type SocketFactory = (url: string) => SocketLike;

/** Por qué la conexión no se reintenta: el estudiante tiene que hacer algo. */
export type ConnectionFailure = 'session-ended' | 'unsupported-technique';

export interface ConnectionHandlers {
  /** El resultado del cuadro número `frameNumber`. */
  onResult(message: ResultMessage): void;
  /** Un cuadro no se pudo procesar; la conexión sigue. */
  onFrameError(message: FrameErrorMessage): void;
  /** Quedó abierta y con el token enviado: la primera vez o al reconectar (`reconnected`). */
  onOpen(reconnected: boolean): void;
  /** Se perdió la conexión: se reintenta sola, cada vez más despacio. */
  onLost(): void;
  /** No tiene remedio sin el estudiante: la sesión terminó o SIVRI no valida la técnica. */
  onFailure(kind: ConnectionFailure): void;
}

export interface ConnectionOptions {
  /** `ws://…/ws/validate` o `wss://…/ws/validate`. */
  readonly url: string;
  /** La técnica por validar; sin ella, SIVRI reconoce de cuál de las cinco es la mesa. */
  readonly techniqueId?: string;
  /**
   * El token corto de DataIQ. Con `fresh` se pide uno nuevo en vez de reutilizar el guardado
   * (después de que SIVRI rechazó el anterior). Se rechaza con un 401 si la sesión terminó.
   */
  readonly getToken: (fresh: boolean) => Promise<string>;
  readonly socketFactory?: SocketFactory;
  /** Cuánto esperar antes de cada reintento; el último valor se repite. */
  readonly backoff?: readonly number[];
}

/** El `WebSocket` del navegador, que cumple con lo que se usa de él. */
const browserSocket: SocketFactory = (url) => new WebSocket(url) as unknown as SocketLike;

/** Esperas entre reintentos (ms): 1, 2, 4, 8 y 15 segundos. */
export const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000];

/**
 * El cliente del video continuo (`/ws/validate`, `sivri/backend/README.md`, «Video continuo»):
 *
 * 1. Al abrir manda `{"token": …}` como primer mensaje; el token no va en la dirección.
 * 2. Cada cuadro va como mensaje binario. Se cuentan al enviarlos: el primero de cada conexión
 *    es el 1, y así cada resultado dice a qué cuadro corresponde (`frame_number`).
 * 3. Para renovar el token en la misma conexión, quien lo usa llama `renewToken`.
 * 4. Los errores de un cuadro se avisan y la conexión sigue. Si se corta, se reconecta con
 *    espera creciente (y la cuenta de cuadros vuelve a 1); `nudge` reintenta ya, por ejemplo
 *    cuando el navegador avisa que volvió la red. Un cierre 4401 se reintenta una vez con un
 *    token nuevo; 4404 (técnica que SIVRI no valida) y un segundo 4401 seguido terminan.
 */
export class ValidationConnection {
  private socket: SocketLike | null = null;
  private open = false;
  private stopped = true;
  private lost = false;
  private attempts = 0;
  private frames = 0;
  private rejections = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private wantFreshToken = false;
  /** Cada conexión tiene su número: lo que llega de una anterior no cuenta. */
  private generation = 0;

  constructor(
    private readonly options: ConnectionOptions,
    private readonly handlers: ConnectionHandlers,
  ) {}

  /** ¿Se puede mandar un cuadro? */
  get isOpen(): boolean {
    return this.open;
  }

  /** Empieza a conectar. */
  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    void this.connect();
  }

  /** Termina la conexión y ya no reintenta. */
  stop(): void {
    this.stopped = true;
    this.open = false;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.generation++;
    this.socket?.close(1000);
    this.socket = null;
  }

  /**
   * Manda un cuadro (el JPEG). Devuelve su número en esta conexión, o `null` si no hay
   * conexión abierta: el cuadro no se manda ni se cuenta.
   */
  send(frame: Blob): number | null {
    if (!this.open || !this.socket) return null;
    this.socket.send(frame);
    return ++this.frames;
  }

  /** Manda el token renovado por la conexión abierta. */
  renewToken(token: string): void {
    if (this.open) this.socket?.send(tokenMessage(token));
  }

  /** Reintenta ya, sin esperar el próximo reintento (volvió la red). */
  nudge(): void {
    if (this.stopped || this.open || this.timer === undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    void this.connect();
  }

  private async connect(): Promise<void> {
    const generation = ++this.generation;
    let token: string;
    try {
      token = await this.options.getToken(this.wantFreshToken);
      // Solo con el token nuevo en la mano: si pedirlo falla por la red, el reintento lo vuelve a
      // pedir nuevo y no reutiliza el que SIVRI ya rechazó
      this.wantFreshToken = false;
    } catch (error) {
      if (this.stopped || generation !== this.generation) return;
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.fail('session-ended');
      } else {
        this.lose();
      }
      return;
    }
    if (this.stopped || generation !== this.generation) return;

    const socket = (this.options.socketFactory ?? browserSocket)(this.url());
    this.socket = socket;
    socket.onopen = () => {
      if (generation !== this.generation) return;
      socket.send(tokenMessage(token));
      this.open = true;
      this.frames = 0;
      this.attempts = 0;
      const reconnected = this.lost;
      this.lost = false;
      this.handlers.onOpen(reconnected);
    };
    socket.onmessage = (event) => {
      if (generation === this.generation && typeof event.data === 'string') {
        this.onText(event.data);
      }
    };
    socket.onclose = (event) => {
      if (generation === this.generation) this.onClosed(event.code);
    };
  }

  private url(): string {
    const { url, techniqueId } = this.options;
    return techniqueId ? `${url}?technique_id=${encodeURIComponent(techniqueId)}` : url;
  }

  private onText(text: string): void {
    const message = parseServerMessage(text);
    if (!message) return;
    if (message.type === 'result') {
      this.rejections = 0;
      this.handlers.onResult(message);
    } else if (message.code === 'token_expired' || message.code === 'invalid_token') {
      // Lo que sigue lo decide el cierre de la conexión (4401) o el token que ya va renovado
    } else {
      this.handlers.onFrameError(message);
    }
  }

  private onClosed(code: number): void {
    this.open = false;
    this.socket = null;
    if (this.stopped) return;
    if (code === CLOSE_CODES.unknownTechnique) return this.fail('unsupported-technique');
    if (code === CLOSE_CODES.unauthorized) {
      // El token pudo vencer o ser rechazado: se prueba una vez con otro, nuevo
      if (++this.rejections > 1) return this.fail('session-ended');
      this.wantFreshToken = true;
      void this.connect();
      return;
    }
    this.lose();
  }

  private fail(kind: ConnectionFailure): void {
    this.stopped = true;
    this.open = false;
    this.handlers.onFailure(kind);
  }

  /** Se perdió la conexión: avisa una vez y reintenta con espera creciente. */
  private lose(): void {
    if (!this.lost) {
      this.lost = true;
      this.handlers.onLost();
    }
    const waits = this.options.backoff ?? BACKOFF_MS;
    const wait = waits[Math.min(this.attempts, waits.length - 1)];
    this.attempts++;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.connect();
    }, wait);
  }
}

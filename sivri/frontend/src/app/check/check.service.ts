import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  effect,
  inject,
  Injectable,
  InjectionToken,
  signal,
  untracked,
} from '@angular/core';
import { environment } from '../../environments/environment';
import { CameraError, CameraService } from '../camera/camera.service';
import { captureFrame, type CapturedFrame, type FrameSource } from '../camera/frame-capture';
import { FramePacer } from '../camera/frame-pacer';
import { SentFrames, type SentFrame } from '../camera/sent-frames';
import { ModuleTokenService } from '../core/session/module-token.service';
import {
  type ConnectionFailure,
  type SocketFactory,
  ValidationConnection,
} from '../data/validation-connection';
import {
  initialFlow,
  reduce,
  shouldSendFrames,
  shouldShowCamera,
  type FlowEvent,
  type FlowState,
} from '../domain/flow';
import { readFrame, type FrameReading } from '../domain/frame-reading';

/** Cada cuánto se mira si toca mandar un cuadro (ms); el ritmo lo pone `FramePacer`. */
const TICK_MS = 100;
/** Si el token no se pudo renovar (la red falló), se vuelve a intentar a los 10 segundos. */
const RENEWAL_RETRY_MS = 10_000;

/** Para las pruebas: el WebSocket y la captura se reemplazan. */
export const CHECK_SOCKET_FACTORY = new InjectionToken<SocketFactory | undefined>(
  'CHECK_SOCKET_FACTORY',
  { providedIn: 'root', factory: () => undefined },
);
export const CHECK_CAPTURE = new InjectionToken<
  (video: FrameSource) => Promise<CapturedFrame | null>
>('CHECK_CAPTURE', { providedIn: 'root', factory: () => captureFrame });

/** Lo último que dijo el backend, con el cuadro que se mandó (si todavía se guarda). */
export interface LiveResult {
  readonly reading: FrameReading;
  readonly frame: SentFrame | null;
}

/**
 * La comprobación de una mesa, de punta a punta: abre la cámara, manda cuadros por el
 * WebSocket, lee los resultados y mueve el recorrido (`domain/flow.ts`). Se provee en el
 * componente que la usa (`providers: [CheckService]`), así que vive y muere con su pantalla:
 * al salir apaga la cámara y cierra la conexión.
 *
 * Mientras se encuadra y se arma, se mandan cuadros. Al fijarse el resultado se deja de mandar
 * (y se apagan la cámara y la conexión); el resultado se queda sobre **el cuadro que se mandó**,
 * no sobre el video de ahora.
 */
@Injectable()
export class CheckService {
  private readonly camera = inject(CameraService);
  private readonly tokens = inject(ModuleTokenService);
  private readonly document = inject(DOCUMENT);
  private readonly socketFactory = inject(CHECK_SOCKET_FACTORY);
  private readonly capture = inject(CHECK_CAPTURE);

  private readonly state = signal<FlowState>(initialFlow);
  private readonly liveResult = signal<LiveResult | null>(null);
  private readonly fixed = signal<SentFrame | null>(null);

  private readonly frames = new SentFrames();
  private readonly pacer = new FramePacer();
  private video: HTMLVideoElement | null = null;
  private connection: ValidationConnection | null = null;
  private cameraWanted = false;
  private capturing = false;
  private ticker: ReturnType<typeof setInterval> | undefined;
  private renewal: ReturnType<typeof setTimeout> | undefined;
  private techniqueId: string | undefined;

  /** En qué punto del recorrido va. */
  readonly flow = this.state.asReadonly();
  /** El último resultado (para las etiquetas mientras arma) con su cuadro. */
  readonly live = this.liveResult.asReadonly();
  /** El cuadro sobre el que se fijó el resultado. */
  readonly fixedFrame = this.fixed.asReadonly();

  constructor() {
    // La cámara que se apagó al ocultarse la pestaña vuelve sola al video
    effect(() => {
      const stream = this.camera.stream();
      untracked(() => this.attach(stream));
    });
    effect(() => {
      const failure = this.camera.failure();
      if (failure) untracked(() => this.dispatch({ type: failure.kind }));
    });
    const view = this.document.defaultView;
    const online = () => this.onOnline();
    const offline = () => this.onOffline();
    view?.addEventListener('online', online);
    view?.addEventListener('offline', offline);
    inject(DestroyRef).onDestroy(() => {
      view?.removeEventListener('online', online);
      view?.removeEventListener('offline', offline);
      this.stop();
    });
  }

  /** Empieza: abre la cámara sobre `video`. `techniqueId` es opcional: sin él, SIVRI reconoce la técnica. */
  start(video: HTMLVideoElement, techniqueId?: string): void {
    this.video = video;
    this.techniqueId = techniqueId;
    this.state.set(initialFlow);
    this.liveResult.set(null);
    this.fixed.set(null);
    this.apply();
    this.attach(this.camera.stream());
  }

  /** Apaga la cámara y cierra la conexión. */
  stop(): void {
    this.cameraWanted = false;
    this.camera.close();
    this.disconnect();
    clearInterval(this.ticker);
    this.ticker = undefined;
    this.video = null;
  }

  /** «Ya armé la mesa». */
  pressReady(): void {
    this.dispatch({ type: 'ready-pressed' });
  }
  openPiece(index: number): void {
    this.dispatch({ type: 'open-piece', index });
  }
  back(): void {
    this.dispatch({ type: 'back' });
  }
  next(): void {
    this.dispatch({ type: 'next' });
  }
  /** «Revisar de nuevo»: se descarta lo fijado y se vuelve a encuadrar. */
  reviewAgain(): void {
    this.fixed.set(null);
    this.liveResult.set(null);
    this.dispatch({ type: 'review-again' });
  }
  /** «Intentar de nuevo» desde un error: otra vez desde el permiso de la cámara. */
  restart(): void {
    this.fixed.set(null);
    this.liveResult.set(null);
    this.frames.clear();
    this.dispatch({ type: 'restart' });
  }

  // --- el recorrido ---

  private dispatch(event: FlowEvent): void {
    const before = this.state();
    const after = reduce(before, event);
    if (after === before) return;
    this.state.set(after);
    if (after.screen === 'result' && before.screen !== 'result' && after.resultFrame !== null) {
      this.fixed.set(this.frames.get(after.resultFrame));
    }
    this.apply();
  }

  /** Deja la cámara, la conexión y el envío como los pide el estado. */
  private apply(): void {
    const state = this.state();

    if (shouldShowCamera(state)) {
      if (!this.cameraWanted) {
        this.cameraWanted = true;
        void this.openCamera();
      }
    } else if (this.cameraWanted) {
      this.cameraWanted = false;
      this.camera.close();
    }

    // Con «sin conexión» la conexión sigue viva: es la que reintenta
    const needsConnection = shouldSendFrames(state) || state.error === 'no-connection';
    if (needsConnection && !this.connection) {
      this.connect();
    } else if (!needsConnection && this.connection) {
      this.disconnect();
    }

    if (shouldSendFrames(state) && this.ticker === undefined) {
      this.ticker = setInterval(() => void this.tick(), TICK_MS);
    } else if (!shouldSendFrames(state) && this.ticker !== undefined) {
      clearInterval(this.ticker);
      this.ticker = undefined;
    }
  }

  // --- la cámara ---

  private async openCamera(): Promise<void> {
    try {
      await this.camera.open();
      this.dispatch({ type: 'camera-ready' });
    } catch (error) {
      if (!this.cameraWanted) return;
      this.dispatch({ type: error instanceof CameraError ? error.kind : 'no-camera' });
    }
  }

  private attach(stream: MediaStream | null): void {
    const video = this.video;
    if (!video) return;
    video.srcObject = stream;
    if (stream) void Promise.resolve(video.play?.()).catch(() => undefined);
  }

  // --- la conexión ---

  private connect(): void {
    this.connection = new ValidationConnection(
      {
        url: environment.sivriSocketUrl,
        techniqueId: this.techniqueId,
        getToken: (fresh) => (fresh ? this.tokens.renew() : this.tokens.get()),
        socketFactory: this.socketFactory,
      },
      {
        onResult: ({ frameNumber, frame }) => {
          this.pacer.answered(frameNumber);
          const reading = readFrame(frame);
          this.liveResult.set({ reading, frame: this.frames.get(frameNumber) });
          this.dispatch({ type: 'frame', reading, frameNumber, at: Date.now() });
        },
        onFrameError: ({ frameNumber }) => this.pacer.answered(frameNumber),
        onOpen: (reconnected) => {
          // Cada conexión cuenta sus cuadros desde 1
          this.frames.clear();
          this.pacer.reset();
          this.scheduleRenewal();
          if (reconnected) this.dispatch({ type: 'connection-back' });
        },
        onLost: () => this.dispatch({ type: 'connection-lost' }),
        onFailure: (kind: ConnectionFailure) =>
          this.dispatch({
            type: kind === 'session-ended' ? 'session-ended' : 'technique-unsupported',
          }),
      },
    );
    this.connection.start();
  }

  private disconnect(): void {
    clearTimeout(this.renewal);
    this.renewal = undefined;
    this.connection?.stop();
    this.connection = null;
    this.frames.clear();
    this.pacer.reset();
  }

  /** El token dura 5 minutos: se renueva antes y se manda por la misma conexión. */
  private scheduleRenewal(): void {
    clearTimeout(this.renewal);
    this.renewal = setTimeout(
      () => void this.renewToken(),
      Math.max(this.tokens.untilRenewal(), 1_000),
    );
  }

  private async renewToken(): Promise<void> {
    let retry = false;
    try {
      this.connection?.renewToken(await this.tokens.renew());
    } catch {
      // Un 401 (la sesión terminó) ya lo atendió `unauthorizedInterceptor`; otra falla, se reintenta
      retry = true;
    }
    if (!this.connection) return;
    if (retry) {
      this.renewal = setTimeout(() => void this.renewToken(), RENEWAL_RETRY_MS);
    } else {
      this.scheduleRenewal();
    }
  }

  private onOnline(): void {
    this.connection?.nudge();
    if (this.state().error === 'no-connection' && this.connection?.isOpen) {
      this.dispatch({ type: 'connection-back' });
    }
  }

  private onOffline(): void {
    this.dispatch({ type: 'connection-lost' });
  }

  // --- el envío ---

  private async tick(): Promise<void> {
    const connection = this.connection;
    const video = this.video;
    if (!connection?.isOpen || !video || this.capturing) return;
    if (!shouldSendFrames(this.state()) || !this.pacer.canSend(Date.now())) return;
    this.capturing = true;
    try {
      const captured = await this.capture(video);
      if (!captured || connection !== this.connection) return;
      const number = connection.send(captured.blob);
      if (number === null) return;
      this.pacer.sent(Date.now(), number);
      this.frames.add(number, captured);
    } finally {
      this.capturing = false;
    }
  }
}

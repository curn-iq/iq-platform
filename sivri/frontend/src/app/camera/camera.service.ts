import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';

/**
 * Por qué no abrió la cámara. Son los dos estados de error de la cámara de los mockups:
 * «Cámara bloqueada» (el estudiante no dio el permiso o el navegador no lo permite) y «Equipo
 * sin cámara» (no hay ninguna, otra app la usa o el navegador no ofrece `mediaDevices`, que
 * es lo que pasa fuera de HTTPS y de `localhost`).
 */
export type CameraErrorKind = 'camera-blocked' | 'no-camera';

export class CameraError extends Error {
  constructor(
    readonly kind: CameraErrorKind,
    options?: ErrorOptions,
  ) {
    super(kind, options);
    this.name = 'CameraError';
  }
}

/** Los errores de `getUserMedia` que dicen que el permiso se negó. */
const DENIED = ['NotAllowedError', 'SecurityError', 'PermissionDeniedError'];

export function cameraErrorKind(error: unknown): CameraErrorKind {
  const name =
    typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
  return DENIED.includes(name) ? 'camera-blocked' : 'no-camera';
}

/** `navigator.mediaDevices`; es `undefined` fuera de HTTPS y de `localhost`. */
export const MEDIA_DEVICES = new InjectionToken<MediaDevices | undefined>('MEDIA_DEVICES', {
  providedIn: 'root',
  factory: () => globalThis.navigator?.mediaDevices,
});

/**
 * La cámara trasera del celular. Se apaga al salir de la pantalla (`close`) y al ocultarse la
 * pestaña, y se vuelve a abrir sola al volver, si la pantalla la sigue necesitando: así no
 * queda la luz de la cámara encendida ni se gasta batería con la pestaña en segundo plano.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly devices = inject(MEDIA_DEVICES);
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<MediaStream | null>(null);
  private readonly lastFailure = signal<CameraError | null>(null);
  private wanted = false;
  private opening: Promise<MediaStream> | undefined;

  /** El video abierto, o `null`. */
  readonly stream = this.current.asReadonly();
  /** Por qué no pudo volver a abrirse al volver a la pestaña (la primera vez, `open` lo rechaza). */
  readonly failure = this.lastFailure.asReadonly();

  constructor() {
    const onVisibility = () => this.onVisibility();
    this.document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibility);
      this.close();
    });
  }

  /** Abre la cámara trasera. Se rechaza con `CameraError`. Una apertura a la vez. */
  open(): Promise<MediaStream> {
    this.wanted = true;
    this.lastFailure.set(null);
    this.opening ??= this.acquire().finally(() => (this.opening = undefined));
    return this.opening;
  }

  /** Apaga la cámara y deja de reabrirla. */
  close(): void {
    this.wanted = false;
    this.release();
  }

  private async acquire(): Promise<MediaStream> {
    const current = this.current();
    if (current?.active) return current;
    if (!this.devices) throw new CameraError('no-camera');
    try {
      for (;;) {
        const stream = await this.devices.getUserMedia({
          audio: false,
          video: {
            // La cámara trasera si hay; con una sola, esa
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (!this.wanted) {
          // Se cerró mientras se pedía el permiso: no se deja abierta
          stream.getTracks().forEach((track) => track.stop());
          throw new CameraError('no-camera');
        }
        if (!this.document.hidden) {
          this.current.set(stream);
          return stream;
        }
        // La pestaña se ocultó mientras se pedía el permiso: se apaga y se vuelve a pedir al
        // volver, para que la cámara no quede encendida en segundo plano
        stream.getTracks().forEach((track) => track.stop());
        await this.whenVisible();
        if (!this.wanted) throw new CameraError('no-camera');
      }
    } catch (error) {
      throw error instanceof CameraError
        ? error
        : new CameraError(cameraErrorKind(error), { cause: error });
    }
  }

  /** Se cumple cuando la pestaña vuelve a verse. */
  private whenVisible(): Promise<void> {
    return new Promise((resolve) => {
      const onChange = () => {
        if (this.document.hidden) return;
        this.document.removeEventListener('visibilitychange', onChange);
        resolve();
      };
      this.document.addEventListener('visibilitychange', onChange);
    });
  }

  private release(): void {
    this.current()
      ?.getTracks()
      .forEach((track) => track.stop());
    this.current.set(null);
  }

  private onVisibility(): void {
    if (this.document.hidden) {
      this.release();
    } else if (this.wanted && !this.current()) {
      this.open().catch((error: unknown) =>
        this.lastFailure.set(
          error instanceof CameraError ? error : new CameraError(cameraErrorKind(error)),
        ),
      );
    }
  }
}

import type { CapturedFrame } from './frame-capture';

/** Un cuadro que se mandó, con el número que le toca en la conexión. */
export interface SentFrame extends CapturedFrame {
  readonly number: number;
}

/** Cuántos cuadros se guardan: con uno a la vez, el resultado llega del último o de uno cerca. */
export const SENT_FRAMES_KEPT = 8;

/**
 * Los últimos cuadros que se mandaron, por número (`frame_number`). El resultado llega con la
 * demora de la red y del procesamiento; se dibuja sobre el cuadro que se mandó, no sobre el
 * video de ahora, que ya se movió. Solo se guardan unos pocos: los más viejos se descartan.
 */
export class SentFrames {
  private readonly frames = new Map<number, SentFrame>();

  constructor(private readonly kept = SENT_FRAMES_KEPT) {}

  add(number: number, frame: CapturedFrame): SentFrame {
    const sent: SentFrame = { ...frame, number };
    this.frames.set(number, sent);
    // El mapa conserva el orden de inserción: el primero es el más viejo
    while (this.frames.size > this.kept) {
      this.frames.delete(this.frames.keys().next().value as number);
    }
    return sent;
  }

  get(number: number): SentFrame | null {
    return this.frames.get(number) ?? null;
  }

  /** Se acabó la conexión: sus números ya no valen (la siguiente vuelve a empezar en 1). */
  clear(): void {
    this.frames.clear();
  }
}

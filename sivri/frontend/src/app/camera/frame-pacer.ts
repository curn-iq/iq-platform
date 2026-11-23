/** Un cuadro cada 400 ms: 2,5 por segundo, entre los 2 y 3 que pide el backend. */
export const FRAME_INTERVAL_MS = 400;

/**
 * Cuánto se espera la respuesta de un cuadro. Si no llega (el backend descarta cuadros y no
 * contesta los saltados, o se perdió en la red), se sigue con el próximo en vez de quedarse
 * esperando para siempre.
 */
export const RESPONSE_TIMEOUT_MS = 5_000;

/**
 * Cuándo toca mandar el próximo cuadro: **uno a la vez** (no se manda otro hasta recibir el
 * resultado del anterior o un error) y no más de uno cada `FRAME_INTERVAL_MS`. No manda nada:
 * quien tiene la cámara pregunta `canSend(ahora)` en cada vuelta y avisa lo que pasó.
 */
export class FramePacer {
  private lastSentAt = Number.NEGATIVE_INFINITY;
  private waitingFor: number | null = null;

  constructor(
    private readonly interval = FRAME_INTERVAL_MS,
    private readonly timeout = RESPONSE_TIMEOUT_MS,
  ) {}

  /** ¿Se puede mandar otro cuadro ahora (`now`, en milisegundos)? */
  canSend(now: number): boolean {
    const elapsed = now - this.lastSentAt;
    if (this.waitingFor !== null && elapsed < this.timeout) return false;
    return elapsed >= this.interval;
  }

  /** Se mandó el cuadro `frameNumber`: se espera su respuesta. */
  sent(now: number, frameNumber: number): void {
    this.lastSentAt = now;
    this.waitingFor = frameNumber;
  }

  /**
   * Llegó el resultado o el error de un cuadro. Se libera si es del que se esperaba o de uno
   * posterior; la respuesta de uno anterior (de un cuadro que se dio por perdido) no.
   */
  answered(frameNumber: number): void {
    if (this.waitingFor !== null && frameNumber >= this.waitingFor) this.waitingFor = null;
  }

  /** Empieza de nuevo (otra conexión: la cuenta de cuadros vuelve a 1). */
  reset(): void {
    this.lastSentAt = Number.NEGATIVE_INFINITY;
    this.waitingFor = null;
  }
}

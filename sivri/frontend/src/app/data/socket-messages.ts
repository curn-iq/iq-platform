import type { components } from './api/sivri';

/**
 * Los mensajes del WebSocket `/ws/validate`. No salen en OpenAPI: se escriben a mano
 * según `sivri/backend/README.md` («Video continuo») y `routes/stream.py`.
 */

export type FrameOut = components['schemas']['FrameOut'];

/** Lo que el servidor manda por cuadro: el resultado del cuadro número `frameNumber`. */
export interface ResultMessage {
  readonly type: 'result';
  /** El orden del cuadro en la conexión: el primero que se manda es el 1. */
  readonly frameNumber: number;
  readonly frame: FrameOut;
}

/** Errores de un cuadro: se avisan con su número y la conexión sigue. */
export type FrameErrorCode = 'invalid_image' | 'too_large' | 'catalog_unavailable';

export interface FrameErrorMessage {
  readonly type: 'error';
  readonly code: FrameErrorCode;
  readonly frameNumber: number;
}

/** El token venció sin renovarse (con su cuadro): el servidor cierra con el código 4401. */
export interface TokenExpiredMessage {
  readonly type: 'error';
  readonly code: 'token_expired';
  readonly frameNumber: number | null;
}

/** El token renovado fue rechazado: la conexión sigue con el anterior hasta que venza. */
export interface InvalidTokenMessage {
  readonly type: 'error';
  readonly code: 'invalid_token';
  readonly frameNumber: null;
}

export type ServerMessage =
  ResultMessage | FrameErrorMessage | TokenExpiredMessage | InvalidTokenMessage;

/** Códigos con los que el servidor cierra la conexión. */
export const CLOSE_CODES = {
  /** El primer mensaje no lleva el token. */
  protocol: 4400,
  /** Token inválido, vencido o rechazado por DataIQ. */
  unauthorized: 4401,
  /** La técnica de la dirección no está entre las que SIVRI valida. */
  unknownTechnique: 4404,
} as const;

const FRAME_ERRORS: readonly string[] = ['invalid_image', 'too_large', 'catalog_unavailable'];

/** Lo que el cliente manda primero y en cada renovación. */
export function tokenMessage(token: string): string {
  return JSON.stringify({ token });
}

/**
 * Lee un mensaje de texto del servidor. Lo que no se entiende da `null`: el cliente lo
 * ignora, no corta la conexión por un mensaje que no conoce.
 */
export function parseServerMessage(text: string): ServerMessage | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const message = raw as Record<string, unknown>;
  const number = message['frame_number'];
  const frameNumber = typeof number === 'number' ? number : null;

  if (message['type'] === 'result') {
    const frame = message['frame'];
    if (frameNumber === null || typeof frame !== 'object' || frame === null) return null;
    return { type: 'result', frameNumber, frame: frame as FrameOut };
  }
  if (message['type'] === 'error') {
    const code = message['code'];
    if (typeof code !== 'string') return null;
    if (FRAME_ERRORS.includes(code) && frameNumber !== null) {
      return { type: 'error', code: code as FrameErrorCode, frameNumber };
    }
    if (code === 'token_expired') return { type: 'error', code, frameNumber };
    if (code === 'invalid_token') return { type: 'error', code, frameNumber: null };
  }
  return null;
}

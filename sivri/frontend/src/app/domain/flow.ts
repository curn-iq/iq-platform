import { corrections, type FrameReading } from './frame-reading';
import { markerStatus, type MarkerStatus } from './markers';

/**
 * El recorrido del estudiante, como una máquina de estados pura (sin Angular ni cámara):
 *
 *   permiso → encuadrar → armar → resultado → pieza por mover → revisar de nuevo
 *
 * Mientras arma, SIVRI solo nombra lo que ve. Cuando pulsa «Ya armé la mesa», se espera a que
 * la misma técnica salga primera en `RESULT_STREAK` resultados seguidos para fijar el
 * resultado; entonces se deja de mandar cuadros y el resultado se queda quieto sobre el
 * cuadro que se mandó. Cada estado de error es una página de texto aparte.
 */

/** Cuántos resultados seguidos con la misma técnica primera fijan el resultado (unos 2 segundos). */
export const RESULT_STREAK = 5;

/** Cuánto sin ver la mesa (ms) antes de volver a «Encuadra la mesa». */
export const BOARD_LOST_MS = 3_000;

export type Screen = 'permission' | 'framing' | 'assembling' | 'result' | 'piece';

export type ErrorKind =
  | 'camera-blocked'
  | 'no-camera'
  | 'no-connection'
  | 'session-ended'
  | 'unsupported-technique'
  | 'not-recognized';

export interface FlowState {
  readonly screen: Screen;
  /** Si hay un error, se muestra su página en vez de la pantalla. */
  readonly error: ErrorKind | null;
  /** Se pulsó «Ya armé la mesa» y se espera a que el resultado se fije. */
  readonly committed: boolean;
  /** Cuántos resultados seguidos van con la misma técnica primera (o sin reconocerla). */
  readonly streak: { readonly key: string; readonly count: number } | null;
  /** Desde cuándo no se ve la mesa (ms), o `null` si se ve. */
  readonly lostSince: number | null;
  /** Qué marcadores se ven en el último resultado. */
  readonly markers: MarkerStatus;
  /** El resultado fijado. */
  readonly result: FrameReading | null;
  /** El número del cuadro sobre el que se fijó, para dibujar sobre esa imagen. */
  readonly resultFrame: number | null;
  /** Cuál de las piezas por corregir se muestra (en `corrections`). */
  readonly pieceIndex: number;
}

export type FlowEvent =
  | { readonly type: 'camera-ready' }
  | { readonly type: 'camera-blocked' }
  | { readonly type: 'no-camera' }
  | {
      readonly type: 'frame';
      readonly reading: FrameReading;
      readonly frameNumber: number;
      readonly at: number;
    }
  | { readonly type: 'ready-pressed' }
  | { readonly type: 'open-piece'; readonly index: number }
  | { readonly type: 'back' }
  | { readonly type: 'next' }
  | { readonly type: 'review-again' }
  | { readonly type: 'restart' }
  | { readonly type: 'connection-lost' }
  | { readonly type: 'connection-back' }
  | { readonly type: 'session-ended' }
  | { readonly type: 'technique-unsupported' };

export const initialFlow: FlowState = {
  screen: 'permission',
  error: null,
  committed: false,
  streak: null,
  lostSince: null,
  markers: markerStatus([]),
  result: null,
  resultFrame: null,
  pieceIndex: 0,
};

/** Vuelve a «Encuadra la mesa» con la cámara abierta: lo que se había fijado se descarta. */
const framing: FlowState = { ...initialFlow, screen: 'framing' };

/** Con qué se compara el resultado seguido: la técnica primera, o «ninguna» si no se reconoció. */
function streakKey(reading: FrameReading): string {
  return reading.recognized && reading.techniques.length > 0
    ? reading.techniques[0].techniqueId
    : 'none';
}

function onFrame(
  state: FlowState,
  reading: FrameReading,
  frameNumber: number,
  at: number,
): FlowState {
  // Solo se miran los cuadros mientras se encuadra o se arma
  if (state.error || (state.screen !== 'framing' && state.screen !== 'assembling')) return state;
  const markers = markerStatus(reading.markers);

  if (!reading.boardFound) {
    const lostSince = state.lostSince ?? at;
    if (at - lostSince >= BOARD_LOST_MS) return { ...framing, markers };
    return { ...state, markers, lostSince, streak: null };
  }

  const seen: FlowState = { ...state, markers, lostSince: null, screen: 'assembling' };
  if (!state.committed) return { ...seen, streak: null };

  const key = streakKey(reading);
  const count = state.streak?.key === key ? state.streak.count + 1 : 1;
  if (count < RESULT_STREAK) return { ...seen, streak: { key, count } };
  if (key === 'none') return { ...seen, committed: false, streak: null, error: 'not-recognized' };
  return { ...seen, screen: 'result', streak: null, result: reading, resultFrame: frameNumber };
}

/** Lo que hay que corregir de la técnica fijada, en el orden en que se recorre. */
function pending(state: FlowState) {
  const top = state.result?.techniques[0];
  return top ? corrections(top) : [];
}

export function reduce(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case 'restart':
      // «Intentar de nuevo» desde un error: otra vez desde el permiso de la cámara
      return initialFlow;
    case 'camera-ready':
      return state.screen === 'permission' && !state.error ? { ...framing } : state;
    case 'camera-blocked':
      return { ...state, error: 'camera-blocked' };
    case 'no-camera':
      return { ...state, error: 'no-camera' };
    case 'session-ended':
      return { ...state, error: 'session-ended' };
    case 'technique-unsupported':
      return { ...state, error: 'unsupported-technique' };
    case 'connection-lost':
      // Un resultado fijado se ve sin red: solo importa mientras se mandan cuadros
      return state.screen === 'result' || state.screen === 'piece' || state.error
        ? state
        : { ...state, error: 'no-connection' };
    case 'connection-back':
      return state.error === 'no-connection' ? { ...framing } : state;
    case 'frame':
      return onFrame(state, event.reading, event.frameNumber, event.at);
    case 'ready-pressed':
      return canCommit(state) ? { ...state, committed: true, streak: null } : state;
    case 'open-piece':
      return state.screen === 'result' && event.index >= 0 && event.index < pending(state).length
        ? { ...state, screen: 'piece', pieceIndex: event.index }
        : state;
    case 'back':
      return state.screen === 'piece' ? { ...state, screen: 'result' } : state;
    case 'next':
      if (state.screen !== 'piece') return state;
      return state.pieceIndex + 1 < pending(state).length
        ? { ...state, pieceIndex: state.pieceIndex + 1 }
        : { ...state, screen: 'result' };
    case 'review-again':
      // Desde el resultado o desde «no se reconoce la técnica»: otra vez a encuadrar
      return state.screen === 'result' ||
        state.screen === 'piece' ||
        state.error === 'not-recognized'
        ? { ...framing }
        : state;
  }
}

/** «Ya armé la mesa» se activa con los cuatro marcadores a la vista y antes de pulsarlo. */
export function canCommit(state: FlowState): boolean {
  return (
    state.screen === 'assembling' && !state.committed && !state.error && state.markers.complete
  );
}

/** ¿Hay que mandar cuadros? Solo con la cámara abierta, sin error y sin resultado fijado. */
export function shouldSendFrames(state: FlowState): boolean {
  return !state.error && (state.screen === 'framing' || state.screen === 'assembling');
}

/** ¿Debe estar abierta la cámara? También mientras se pide el permiso. */
export function shouldShowCamera(state: FlowState): boolean {
  return !state.error && state.screen !== 'result' && state.screen !== 'piece';
}

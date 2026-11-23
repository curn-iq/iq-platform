import {
  BOARD_LOST_MS,
  canCommit,
  type FlowEvent,
  type FlowState,
  initialFlow,
  reduce,
  RESULT_STREAK,
  shouldSendFrames,
  shouldShowCamera,
} from './flow';
import { readFrame } from './frame-reading';
import { ALL_MARKERS, frame, object, technique } from './testing';

const mastectomy = technique('t-1', 'Mastectomía', [
  object('in_place', 'A', 1),
  object('move', 'B', 3, { message: 'B (n.º 3): va al centro.' }),
  object('missing', 'C', 4, { message: 'Falta C (n.º 4): va al final.' }),
]);
const thyroid = technique('t-2', 'Tiroidectomía', [object('in_place', 'A', 1)]);

const recognized = (...techniques: (typeof mastectomy)[]) => readFrame(frame({ techniques }));
const withoutBoard = readFrame(frame({ board_found: false, markers: ALL_MARKERS.slice(0, 3) }));
const notRecognized = readFrame(frame({ recognized: false }));

function run(events: FlowEvent[], from: FlowState = initialFlow): FlowState {
  return events.reduce(reduce, from);
}

let clock = 0;
const seen = (reading = recognized(mastectomy), n = 1): FlowEvent[] =>
  Array.from({ length: n }, () => ({
    type: 'frame' as const,
    reading,
    frameNumber: ++clock,
    at: clock * 400,
  }));

const assembling = () => run([{ type: 'camera-ready' }, ...seen()]);
const committed = () => run([{ type: 'ready-pressed' }], assembling());
const fixed = () => run(seen(recognized(mastectomy), RESULT_STREAK), committed());

describe('el recorrido', () => {
  beforeEach(() => (clock = 0));

  it('empieza pidiendo el permiso de la cámara y, con ella abierta, a encuadrar', () => {
    expect(initialFlow.screen).toBe('permission');
    expect(shouldShowCamera(initialFlow)).toBe(true);
    expect(shouldSendFrames(initialFlow)).toBe(false);
    const state = reduce(initialFlow, { type: 'camera-ready' });
    expect(state.screen).toBe('framing');
    expect(shouldSendFrames(state)).toBe(true);
  });

  describe('encuadrar y armar', () => {
    it('sin los cuatro marcadores se sigue encuadrando y se dice cuál falta', () => {
      const state = run([{ type: 'camera-ready' }, ...seen(withoutBoard)]);
      expect(state.screen).toBe('framing');
      expect(state.markers.phrase).toBe('Falta el de abajo a la izquierda.');
      expect(canCommit(state)).toBe(false);
    });

    it('con los cuatro pasa a armar y «Ya armé la mesa» se activa', () => {
      const state = assembling();
      expect(state.screen).toBe('assembling');
      expect(state.markers.complete).toBe(true);
      expect(canCommit(state)).toBe(true);
    });

    it('perder la mesa un instante no saca de armar; tres segundos, sí', () => {
      const lost = (at: number): FlowEvent => ({
        type: 'frame',
        reading: withoutBoard,
        frameNumber: 90,
        at,
      });
      let state = run([lost(10_000)], assembling());
      expect(state.screen).toBe('assembling');
      state = run([lost(10_000 + BOARD_LOST_MS - 1)], state);
      expect(state.screen).toBe('assembling');
      state = run([lost(10_000 + BOARD_LOST_MS)], state);
      expect(state.screen).toBe('framing');
      expect(state.committed).toBe(false);
    });

    it('volver a ver la mesa reinicia la cuenta de lo perdido', () => {
      const lost = (at: number): FlowEvent => ({
        type: 'frame',
        reading: withoutBoard,
        frameNumber: 90,
        at,
      });
      let state = run([lost(10_000)], assembling());
      state = run(seen(), state);
      expect(state.lostSince).toBeNull();
      state = run([lost(20_000), lost(20_000 + BOARD_LOST_MS - 1)], state);
      expect(state.screen).toBe('assembling');
    });

    it('«Ya armé la mesa» solo cuenta con los cuatro marcadores y una vez', () => {
      expect(
        reduce(run([{ type: 'camera-ready' }, ...seen(withoutBoard)]), { type: 'ready-pressed' })
          .committed,
      ).toBe(false);
      const state = committed();
      expect(state.committed).toBe(true);
      expect(canCommit(state)).toBe(false);
    });
  });

  describe('fijar el resultado', () => {
    it('antes de pulsar el botón no se fija nada, por muchos resultados que lleguen', () => {
      const state = run(seen(recognized(mastectomy), RESULT_STREAK * 2), assembling());
      expect(state.screen).toBe('assembling');
      expect(state.result).toBeNull();
    });

    it('se fija cuando la misma técnica sale primera en 5 resultados seguidos', () => {
      let state = run(seen(recognized(mastectomy), RESULT_STREAK - 1), committed());
      expect(state.screen).toBe('assembling');
      state = run(seen(recognized(mastectomy)), state);
      expect(state.screen).toBe('result');
      expect(state.result?.techniques[0].name).toBe('Mastectomía');
      expect(state.resultFrame).toBe(clock);
      expect(shouldSendFrames(state)).toBe(false);
      expect(shouldShowCamera(state)).toBe(false);
    });

    it('si cambia la técnica primera, la cuenta empieza de nuevo', () => {
      let state = run(seen(recognized(mastectomy), RESULT_STREAK - 1), committed());
      state = run(seen(recognized(thyroid), RESULT_STREAK - 1), state);
      expect(state.screen).toBe('assembling');
      state = run(seen(recognized(thyroid)), state);
      expect(state.result?.techniques[0].name).toBe('Tiroidectomía');
    });

    it('perder la mesa en medio también reinicia la cuenta', () => {
      let state = run(seen(recognized(mastectomy), RESULT_STREAK - 1), committed());
      state = run(seen(withoutBoard), state);
      state = run(seen(recognized(mastectomy), RESULT_STREAK - 1), state);
      expect(state.screen).toBe('assembling');
    });

    it('con dos técnicas muy cerca, la primera es la que cuenta', () => {
      const state = run(seen(recognized(mastectomy, thyroid), RESULT_STREAK), committed());
      expect(state.screen).toBe('result');
      expect(state.result?.techniques).toHaveLength(2);
    });

    it('si la mesa se ve pero no se reconoce la técnica, se dice en vez de quedarse esperando', () => {
      const state = run(seen(notRecognized, RESULT_STREAK), committed());
      expect(state.error).toBe('not-recognized');
      expect(state.committed).toBe(false);
      expect(shouldSendFrames(state)).toBe(false);
    });

    it('los cuadros que llegan con el resultado fijado no lo cambian', () => {
      const before = fixed();
      const after = run(seen(recognized(thyroid), RESULT_STREAK * 2), before);
      expect(after).toBe(before);
    });
  });

  describe('resultado y pieza por mover', () => {
    it('abre una pieza por corregir (por mover y luego falta), y «Siguiente» recorre todas', () => {
      let state = run([{ type: 'open-piece', index: 0 }], fixed());
      expect(state.screen).toBe('piece');
      expect(state.pieceIndex).toBe(0);
      state = run([{ type: 'next' }], state);
      expect(state.pieceIndex).toBe(1);
    });

    it('«Siguiente» en la última vuelve al resultado, y «Resultado» siempre', () => {
      let state = run([{ type: 'open-piece', index: 1 }, { type: 'next' }], fixed());
      expect(state.screen).toBe('result');
      state = run([{ type: 'open-piece', index: 0 }, { type: 'back' }], fixed());
      expect(state.screen).toBe('result');
    });

    it('no abre una pieza que no existe', () => {
      const before = fixed();
      expect(reduce(before, { type: 'open-piece', index: 2 })).toBe(before);
      expect(reduce(before, { type: 'open-piece', index: -1 })).toBe(before);
      expect(reduce(assembling(), { type: 'open-piece', index: 0 }).screen).toBe('assembling');
    });

    it('«Revisar de nuevo» descarta lo fijado y vuelve a encuadrar', () => {
      const state = run([{ type: 'review-again' }], fixed());
      expect(state.screen).toBe('framing');
      expect(state.result).toBeNull();
      expect(state.committed).toBe(false);
      expect(shouldSendFrames(state)).toBe(true);
    });

    it('también se revisa de nuevo desde una pieza y desde «no se reconoce la técnica»', () => {
      expect(
        run([{ type: 'open-piece', index: 0 }, { type: 'review-again' }], fixed()).screen,
      ).toBe('framing');
      const lost = run(seen(notRecognized, RESULT_STREAK), committed());
      expect(run([{ type: 'review-again' }], lost)).toMatchObject({
        screen: 'framing',
        error: null,
      });
    });
  });

  describe('errores', () => {
    it('cámara bloqueada y equipo sin cámara paran todo hasta intentar de nuevo', () => {
      for (const type of ['camera-blocked', 'no-camera'] as const) {
        const state = run([{ type }]);
        expect(state.error).toBe(type);
        expect(shouldShowCamera(state)).toBe(false);
        expect(shouldSendFrames(state)).toBe(false);
        expect(run([{ type: 'restart' }], state)).toEqual(initialFlow);
      }
    });

    it('con error no se atienden los cuadros', () => {
      const blocked = run([{ type: 'camera-ready' }, { type: 'camera-blocked' }]);
      expect(run(seen(), blocked)).toBe(blocked);
    });

    it('sin conexión mientras se mandan cuadros: error; al volver la red, a encuadrar', () => {
      let state = run([{ type: 'connection-lost' }], assembling());
      expect(state.error).toBe('no-connection');
      state = run([{ type: 'connection-back' }], state);
      expect(state).toMatchObject({ error: null, screen: 'framing' });
    });

    it('un resultado fijado se sigue viendo sin red', () => {
      const before = fixed();
      expect(run([{ type: 'connection-lost' }], before)).toBe(before);
    });

    it('la sesión terminada y la técnica fuera del alcance se muestran desde cualquier pantalla', () => {
      expect(run([{ type: 'session-ended' }], assembling()).error).toBe('session-ended');
      expect(run([{ type: 'session-ended' }], fixed()).error).toBe('session-ended');
      expect(run([{ type: 'technique-unsupported' }], assembling()).error).toBe(
        'unsupported-technique',
      );
    });

    it('al volver la red no se borra otro error', () => {
      const ended = run([{ type: 'session-ended' }], assembling());
      expect(run([{ type: 'connection-back' }], ended)).toBe(ended);
      expect(run([{ type: 'connection-lost' }], ended)).toBe(ended);
    });
  });
});

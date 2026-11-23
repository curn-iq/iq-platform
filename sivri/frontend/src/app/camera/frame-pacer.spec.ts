import { FRAME_INTERVAL_MS, FramePacer, RESPONSE_TIMEOUT_MS } from './frame-pacer';

describe('FramePacer', () => {
  it('el primer cuadro se manda de una', () => {
    expect(new FramePacer().canSend(0)).toBe(true);
  });

  it('uno a la vez: hasta que llega la respuesta no se manda otro', () => {
    const pacer = new FramePacer();
    pacer.sent(0, 1);
    expect(pacer.canSend(FRAME_INTERVAL_MS * 3)).toBe(false);
    pacer.answered(1);
    expect(pacer.canSend(FRAME_INTERVAL_MS * 3)).toBe(true);
  });

  it('respondido, igual se respeta el intervalo: no más de 2,5 cuadros por segundo', () => {
    const pacer = new FramePacer();
    pacer.sent(1_000, 1);
    pacer.answered(1);
    expect(pacer.canSend(1_000 + FRAME_INTERVAL_MS - 1)).toBe(false);
    expect(pacer.canSend(1_000 + FRAME_INTERVAL_MS)).toBe(true);
  });

  it('un error del cuadro también lo libera (se avisa con `answered`)', () => {
    const pacer = new FramePacer();
    pacer.sent(0, 4);
    pacer.answered(4);
    expect(pacer.canSend(FRAME_INTERVAL_MS)).toBe(true);
  });

  it('la respuesta de un cuadro posterior (el backend saltó el nuestro) también libera', () => {
    const pacer = new FramePacer();
    pacer.sent(0, 3);
    pacer.answered(5);
    expect(pacer.canSend(FRAME_INTERVAL_MS)).toBe(true);
  });

  it('la respuesta tardía de un cuadro anterior no libera el que se espera', () => {
    const pacer = new FramePacer();
    pacer.sent(0, 3);
    pacer.answered(2);
    expect(pacer.canSend(FRAME_INTERVAL_MS)).toBe(false);
  });

  it('si la respuesta no llega, a los 5 segundos sigue con el próximo', () => {
    const pacer = new FramePacer();
    pacer.sent(0, 1);
    expect(pacer.canSend(RESPONSE_TIMEOUT_MS - 1)).toBe(false);
    expect(pacer.canSend(RESPONSE_TIMEOUT_MS)).toBe(true);
  });

  it('reset deja mandar de una, como una conexión nueva', () => {
    const pacer = new FramePacer();
    pacer.sent(0, 9);
    pacer.reset();
    expect(pacer.canSend(1)).toBe(true);
  });
});

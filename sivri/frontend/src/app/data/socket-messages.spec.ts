import { parseServerMessage, tokenMessage } from './socket-messages';

describe('socket-messages', () => {
  it('el primer mensaje y las renovaciones llevan solo el token', () => {
    expect(JSON.parse(tokenMessage('abc'))).toEqual({ token: 'abc' });
  });

  it('lee un resultado con el número de su cuadro', () => {
    const frame = { board_found: true, markers: [], detections: [] };
    const message = parseServerMessage(JSON.stringify({ type: 'result', frame_number: 7, frame }));
    expect(message).toEqual({ type: 'result', frameNumber: 7, frame });
  });

  it('lee los errores de un cuadro con su número', () => {
    for (const code of ['invalid_image', 'too_large', 'catalog_unavailable']) {
      expect(parseServerMessage(JSON.stringify({ type: 'error', code, frame_number: 3 }))).toEqual({
        type: 'error',
        code,
        frameNumber: 3,
      });
    }
  });

  it('un error de cuadro sin número no se entiende', () => {
    expect(parseServerMessage('{"type":"error","code":"too_large"}')).toBeNull();
  });

  it('lee el token vencido con o sin cuadro, y el renovado rechazado', () => {
    expect(parseServerMessage('{"type":"error","code":"token_expired","frame_number":5}')).toEqual({
      type: 'error',
      code: 'token_expired',
      frameNumber: 5,
    });
    expect(parseServerMessage('{"type":"error","code":"token_expired"}')).toEqual({
      type: 'error',
      code: 'token_expired',
      frameNumber: null,
    });
    expect(parseServerMessage('{"type":"error","code":"invalid_token"}')).toEqual({
      type: 'error',
      code: 'invalid_token',
      frameNumber: null,
    });
  });

  it('ignora lo que no entiende en vez de fallar', () => {
    expect(parseServerMessage('no es json')).toBeNull();
    expect(parseServerMessage('42')).toBeNull();
    expect(parseServerMessage('{"type":"otra-cosa"}')).toBeNull();
    expect(parseServerMessage('{"type":"result","frame_number":1}')).toBeNull();
    expect(parseServerMessage('{"type":"error","code":"nueva"}')).toBeNull();
  });
});

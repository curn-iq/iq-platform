import { HttpErrorResponse } from '@angular/common/http';
import { FakeSocket } from './fake-socket';
import { BACKOFF_MS, type ConnectionHandlers, ValidationConnection } from './validation-connection';

describe('ValidationConnection', () => {
  let sockets: FakeSocket[];
  let handlers: {
    [K in keyof ConnectionHandlers]: ReturnType<typeof vi.fn<ConnectionHandlers[K]>>;
  };
  let getToken: ReturnType<typeof vi.fn<(fresh: boolean) => Promise<string>>>;

  const make = (techniqueId?: string) =>
    new ValidationConnection(
      {
        url: 'wss://sivri.example/ws/validate',
        techniqueId,
        getToken,
        socketFactory: (url) => {
          const socket = new FakeSocket(url);
          sockets.push(socket);
          return socket;
        },
      },
      handlers,
    );

  /** Deja pasar las promesas pendientes (el token que se pide antes de abrir). */
  const settle = () => vi.advanceTimersByTimeAsync(0);

  async function started(techniqueId?: string) {
    const connection = make(techniqueId);
    connection.start();
    await settle();
    sockets[0].open();
    return connection;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    getToken = vi.fn(() => Promise.resolve('token-1'));
    handlers = {
      onResult: vi.fn(),
      onFrameError: vi.fn(),
      onOpen: vi.fn(),
      onLost: vi.fn(),
      onFailure: vi.fn(),
    };
  });

  afterEach(() => vi.useRealTimers());

  it('abre la conexión y manda el token como primer mensaje, no en la dirección', async () => {
    await started();
    expect(sockets[0].url).toBe('wss://sivri.example/ws/validate');
    expect(sockets[0].sent).toEqual([JSON.stringify({ token: 'token-1' })]);
    expect(handlers.onOpen).toHaveBeenCalledWith(false);
  });

  it('con una técnica, va en la dirección', async () => {
    await started('t 1');
    expect(sockets[0].url).toBe('wss://sivri.example/ws/validate?technique_id=t%201');
  });

  it('cuenta los cuadros al mandarlos, desde el 1', async () => {
    const connection = await started();
    const frame = new Blob(['x']);
    expect(connection.send(frame)).toBe(1);
    expect(connection.send(frame)).toBe(2);
    expect(connection.send(frame)).toBe(3);
    expect(sockets[0].sent.slice(1)).toEqual([frame, frame, frame]);
  });

  it('sin conexión abierta no manda ni cuenta', async () => {
    const connection = make();
    expect(connection.send(new Blob(['x']))).toBeNull();
    connection.start();
    await settle();
    expect(connection.send(new Blob(['x']))).toBeNull();
  });

  it('entrega los resultados y los errores de un cuadro, y sigue abierta', async () => {
    const connection = await started();
    sockets[0].say({ type: 'result', frame_number: 2, frame: { board_found: true } });
    sockets[0].say({ type: 'error', code: 'too_large', frame_number: 3 });
    expect(handlers.onResult).toHaveBeenCalledWith({
      type: 'result',
      frameNumber: 2,
      frame: { board_found: true },
    });
    expect(handlers.onFrameError).toHaveBeenCalledWith({
      type: 'error',
      code: 'too_large',
      frameNumber: 3,
    });
    expect(connection.isOpen).toBe(true);
    expect(handlers.onLost).not.toHaveBeenCalled();
  });

  it('ignora lo que no entiende', async () => {
    await started();
    sockets[0].onmessage?.({ data: 'no es json' });
    sockets[0].onmessage?.({ data: new ArrayBuffer(2) });
    sockets[0].say({ type: 'otra-cosa' });
    expect(handlers.onResult).not.toHaveBeenCalled();
    expect(handlers.onFrameError).not.toHaveBeenCalled();
  });

  it('renueva el token en la misma conexión', async () => {
    const connection = await started();
    connection.renewToken('token-2');
    expect(sockets[0].sent.at(-1)).toBe(JSON.stringify({ token: 'token-2' }));
    expect(sockets).toHaveLength(1);
  });

  describe('si se pierde la conexión', () => {
    it('avisa una vez y reconecta con espera creciente, y la cuenta de cuadros vuelve a 1', async () => {
      const connection = await started();
      connection.send(new Blob(['x']));

      sockets[0].hangUp(1006);
      expect(handlers.onLost).toHaveBeenCalledOnce();
      expect(connection.isOpen).toBe(false);

      // Primer reintento a 1 s; sigue sin red: segundo a 2 s, tercero a 4 s
      await vi.advanceTimersByTimeAsync(BACKOFF_MS[0] - 1);
      expect(sockets).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(sockets).toHaveLength(2);
      sockets[1].hangUp(1006);
      await vi.advanceTimersByTimeAsync(BACKOFF_MS[1]);
      expect(sockets).toHaveLength(3);
      sockets[2].hangUp(1006);
      await vi.advanceTimersByTimeAsync(BACKOFF_MS[2] - 1);
      expect(sockets).toHaveLength(3);
      await vi.advanceTimersByTimeAsync(1);
      expect(sockets).toHaveLength(4);
      expect(handlers.onLost).toHaveBeenCalledOnce();

      sockets[3].open();
      expect(handlers.onOpen).toHaveBeenLastCalledWith(true);
      expect(connection.send(new Blob(['x']))).toBe(1);
    });

    it('la espera no pasa de 15 segundos', async () => {
      await started();
      for (let i = 0; i < 8; i++) {
        sockets.at(-1)!.hangUp(1006);
        await vi.advanceTimersByTimeAsync(15_000);
      }
      expect(sockets).toHaveLength(9);
    });

    it('al volver la red reintenta ya, sin esperar', async () => {
      const connection = await started();
      sockets[0].hangUp(1006);
      connection.nudge();
      await settle();
      expect(sockets).toHaveLength(2);
    });

    it('lo que llega de una conexión anterior ya no cuenta', async () => {
      await started();
      const old = sockets[0];
      old.hangUp(1006);
      await vi.advanceTimersByTimeAsync(BACKOFF_MS[0]);
      sockets[1].open();
      old.say({ type: 'result', frame_number: 1, frame: {} });
      expect(handlers.onResult).not.toHaveBeenCalled();
    });

    it('si el token no se puede pedir por la red, también reintenta', async () => {
      getToken.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));
      const connection = make();
      connection.start();
      await settle();
      expect(handlers.onLost).toHaveBeenCalledOnce();
      expect(sockets).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(BACKOFF_MS[0]);
      expect(sockets).toHaveLength(1);
    });
  });

  describe('lo que no se reintenta', () => {
    it('4404: SIVRI no valida esa técnica', async () => {
      await started();
      sockets[0].hangUp(4404);
      expect(handlers.onFailure).toHaveBeenCalledWith('unsupported-technique');
      await vi.advanceTimersByTimeAsync(60_000);
      expect(sockets).toHaveLength(1);
    });

    it('4401: prueba una vez más con un token nuevo', async () => {
      await started();
      sockets[0].hangUp(4401);
      await settle();
      expect(getToken).toHaveBeenLastCalledWith(true);
      expect(sockets).toHaveLength(2);
      expect(handlers.onFailure).not.toHaveBeenCalled();
    });

    it('un segundo 4401 seguido es que la sesión terminó', async () => {
      await started();
      sockets[0].hangUp(4401);
      await settle();
      sockets[1].open();
      sockets[1].hangUp(4401);
      expect(handlers.onFailure).toHaveBeenCalledWith('session-ended');
      await vi.advanceTimersByTimeAsync(60_000);
      expect(sockets).toHaveLength(2);
    });

    it('con un resultado de por medio, un 4401 vuelve a contar desde cero', async () => {
      await started();
      sockets[0].hangUp(4401);
      await settle();
      sockets[1].open();
      sockets[1].say({ type: 'result', frame_number: 1, frame: {} });
      sockets[1].hangUp(4401);
      await settle();
      expect(sockets).toHaveLength(3);
      expect(handlers.onFailure).not.toHaveBeenCalled();
    });

    it('si DataIQ responde 401 al pedir el token, la sesión terminó', async () => {
      getToken.mockRejectedValueOnce(new HttpErrorResponse({ status: 401 }));
      make().start();
      await settle();
      expect(handlers.onFailure).toHaveBeenCalledWith('session-ended');
      expect(handlers.onLost).not.toHaveBeenCalled();
    });
  });

  it('stop cierra la conexión y no reintenta', async () => {
    const connection = await started();
    connection.stop();
    expect(sockets[0].closed).toBe(1000);
    sockets[0].hangUp(1000);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sockets).toHaveLength(1);
    expect(handlers.onLost).not.toHaveBeenCalled();
    expect(connection.send(new Blob(['x']))).toBeNull();
  });

  it('stop mientras pide el token no abre nada', async () => {
    const connection = make();
    connection.start();
    connection.stop();
    await settle();
    expect(sockets).toHaveLength(0);
  });
});

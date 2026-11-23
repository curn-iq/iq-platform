import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { CameraError, CameraService } from '../camera/camera.service';
import { RESPONSE_TIMEOUT_MS } from '../camera/frame-pacer';
import { ModuleTokenService } from '../core/session/module-token.service';
import { FakeSocket } from '../data/fake-socket';
import { RESULT_STREAK } from '../domain/flow';
import { ALL_MARKERS, frame, object, technique } from '../domain/testing';
import { CHECK_CAPTURE, CHECK_SOCKET_FACTORY, CheckService } from './check.service';

const mastectomy = technique('t-1', 'Mastectomía', [
  object('in_place', 'A', 1),
  object('move', 'B', 3, { message: 'B (n.º 3): va al centro.' }),
]);
const boardFrame = (n: number) => ({
  type: 'result',
  frame_number: n,
  frame: frame({ techniques: [mastectomy] }),
});

describe('CheckService', () => {
  let sockets: FakeSocket[];
  let stream: ReturnType<typeof signal<MediaStream | null>>;
  let camera: {
    open: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    stream: ReturnType<typeof stream.asReadonly>;
    failure: ReturnType<typeof signal<CameraError | null>>;
  };
  let tokens: {
    get: ReturnType<typeof vi.fn>;
    renew: ReturnType<typeof vi.fn>;
    untilRenewal: ReturnType<typeof vi.fn>;
  };
  let video: HTMLVideoElement;
  let service: CheckService;

  const settle = () => vi.advanceTimersByTimeAsync(0);

  /** Arranca y deja la conexión abierta, con la cámara lista. */
  async function started(techniqueId?: string) {
    service.setVideo(video);
    service.start(techniqueId);
    await settle();
    sockets[0].open();
  }

  /** Deja pasar el intervalo de envío: se manda un cuadro, que es el número `n`. */
  const sendNext = () => vi.advanceTimersByTimeAsync(500);

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    stream = signal<MediaStream | null>(null);
    camera = {
      open: vi.fn(() => Promise.resolve({} as MediaStream)),
      close: vi.fn(),
      stream: stream.asReadonly(),
      failure: signal<CameraError | null>(null),
    };
    tokens = {
      get: vi.fn(() => Promise.resolve('token-1')),
      renew: vi.fn(() => Promise.resolve('token-2')),
      untilRenewal: vi.fn(() => 240_000),
    };
    video = document.createElement('video');
    video.play = vi.fn(() => Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        CheckService,
        { provide: CameraService, useValue: camera },
        { provide: ModuleTokenService, useValue: tokens },
        {
          provide: CHECK_SOCKET_FACTORY,
          useValue: (url: string) => {
            const socket = new FakeSocket(url);
            sockets.push(socket);
            return socket;
          },
        },
        {
          provide: CHECK_CAPTURE,
          useValue: () => Promise.resolve({ blob: new Blob(['jpeg']), width: 640, height: 360 }),
        },
      ],
    });
    service = TestBed.inject(CheckService);
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  it('abre la cámara y, con ella lista, conecta y manda el token', async () => {
    await started();
    expect(camera.open).toHaveBeenCalledOnce();
    expect(service.flow().screen).toBe('framing');
    expect(sockets).toHaveLength(1);
    expect(sockets[0].sent).toEqual([JSON.stringify({ token: 'token-1' })]);
  });

  it('no conecta mientras la cámara no esté lista', async () => {
    camera.open.mockReturnValue(new Promise(() => undefined));
    service.setVideo(video);
    service.start();
    await settle();
    expect(service.flow().screen).toBe('permission');
    expect(sockets).toHaveLength(0);
  });

  it('manda un cuadro a la vez y no otro hasta recibir su resultado', async () => {
    await started();
    await sendNext();
    expect(sockets[0].sent).toHaveLength(2);
    await sendNext();
    await sendNext();
    expect(sockets[0].sent).toHaveLength(2);

    sockets[0].say(boardFrame(1));
    await sendNext();
    expect(sockets[0].sent).toHaveLength(3);
  });

  it('si la respuesta no llega, a los 5 segundos sigue con el próximo', async () => {
    await started();
    await sendNext();
    await vi.advanceTimersByTimeAsync(RESPONSE_TIMEOUT_MS);
    expect(sockets[0].sent).toHaveLength(3);
  });

  it('guarda cada cuadro por su número para dibujar el resultado sobre él', async () => {
    await started();
    await sendNext();
    sockets[0].say(boardFrame(1));
    const live = service.live();
    expect(live?.frame).toMatchObject({ number: 1, width: 640, height: 360 });
    expect(live?.reading.boardFound).toBe(true);
    expect(service.flow().screen).toBe('assembling');
  });

  it('un cuadro que ya no se guarda no rompe el resultado: queda sin imagen', async () => {
    await started();
    sockets[0].say(boardFrame(99));
    expect(service.live()?.frame).toBeNull();
  });

  it('con «Ya armé la mesa» y 5 resultados iguales fija el resultado y apaga cámara y conexión', async () => {
    await started();
    await sendNext();
    sockets[0].say(boardFrame(1));
    service.pressReady();
    for (let n = 2; n < 2 + RESULT_STREAK; n++) {
      await sendNext();
      sockets[0].say(boardFrame(n));
    }
    expect(service.flow().screen).toBe('result');
    expect(service.fixedFrame()?.number).toBe(1 + RESULT_STREAK);
    expect(camera.close).toHaveBeenCalled();
    expect(sockets[0].closed).toBe(1000);

    // Ya no se manda nada
    await vi.advanceTimersByTimeAsync(5_000);
    expect(sockets).toHaveLength(1);
  });

  it('«Revisar de nuevo» vuelve a abrir la cámara y la conexión, con la cuenta en 1', async () => {
    await started();
    await sendNext();
    sockets[0].say(boardFrame(1));
    service.pressReady();
    for (let n = 2; n < 2 + RESULT_STREAK; n++) {
      await sendNext();
      sockets[0].say(boardFrame(n));
    }
    service.reviewAgain();
    await settle();
    expect(service.fixedFrame()).toBeNull();
    expect(service.flow().screen).toBe('framing');
    expect(camera.open).toHaveBeenCalledTimes(2);
    expect(sockets).toHaveLength(2);
    sockets[1].open();
    await sendNext();
    sockets[1].say(boardFrame(1));
    expect(service.live()?.frame?.number).toBe(1);
  });

  it('una cámara bloqueada o ausente se dice y no conecta', async () => {
    camera.open.mockRejectedValue(new CameraError('camera-blocked'));
    service.setVideo(video);
    service.start();
    await settle();
    expect(service.flow().error).toBe('camera-blocked');
    expect(sockets).toHaveLength(0);

    camera.open.mockRejectedValue(new CameraError('no-camera'));
    service.restart();
    await settle();
    expect(service.flow().error).toBe('no-camera');
  });

  it('si la cámara no puede volver a abrirse al volver a la pestaña, es cámara bloqueada', async () => {
    await started();
    camera.failure.set(new CameraError('camera-blocked'));
    TestBed.tick();
    expect(service.flow().error).toBe('camera-blocked');
  });

  it('se muestra en el video lo que abre la cámara', async () => {
    const media = {} as MediaStream;
    service.setVideo(video);
    service.start();
    stream.set(media);
    TestBed.tick();
    expect(video.srcObject).toBe(media);
    expect(video.play).toHaveBeenCalled();
  });

  describe('la conexión', () => {
    it('si se corta, dice «sin conexión» y al volver sigue desde encuadrar', async () => {
      await started();
      sockets[0].hangUp(1006);
      expect(service.flow().error).toBe('no-connection');

      await vi.advanceTimersByTimeAsync(1_000);
      expect(sockets).toHaveLength(2);
      sockets[1].open();
      expect(service.flow().error).toBeNull();
      expect(service.flow().screen).toBe('framing');
    });

    it('el aviso del navegador de que no hay red también lo dice, y al volver reconecta', async () => {
      await started();
      window.dispatchEvent(new Event('offline'));
      expect(service.flow().error).toBe('no-connection');
      sockets[0].hangUp(1006);
      window.dispatchEvent(new Event('online'));
      await settle();
      expect(sockets).toHaveLength(2);
    });

    it('4404: la técnica no está entre las que valida SIVRI', async () => {
      await started('t-9');
      expect(sockets[0].url).toContain('technique_id=t-9');
      sockets[0].hangUp(4404);
      expect(service.flow().error).toBe('unsupported-technique');
    });

    it('después de una técnica fuera del alcance, vuelve a intentar sin pedirla', async () => {
      await started('t-9');
      sockets[0].hangUp(4404);
      service.restart();
      await settle();
      sockets[1].open();
      expect(service.flow().error).toBeNull();
      expect(sockets[1].url).not.toContain('technique_id');
    });

    it('si DataIQ responde 401 al pedir el token, la sesión terminó', async () => {
      tokens.get.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
      service.setVideo(video);
      service.start();
      await settle();
      expect(service.flow().error).toBe('session-ended');
    });
  });

  describe('el token', () => {
    it('lo renueva antes de vencer y lo manda por la misma conexión', async () => {
      await started();
      await vi.advanceTimersByTimeAsync(240_000);
      expect(tokens.renew).toHaveBeenCalledOnce();
      expect(sockets[0].sent).toContain(JSON.stringify({ token: 'token-2' }));
      expect(sockets).toHaveLength(1);
    });

    it('si no pudo renovarlo por la red, lo intenta de nuevo a los 10 segundos', async () => {
      await started();
      tokens.renew.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));
      await vi.advanceTimersByTimeAsync(240_000);
      expect(tokens.renew).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(tokens.renew).toHaveBeenCalledTimes(2);
      expect(sockets[0].sent).toContain(JSON.stringify({ token: 'token-2' }));
    });

    it('si DataIQ responde 401 al renovarlo, la sesión terminó y no lo reintenta', async () => {
      await started();
      tokens.renew.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
      await vi.advanceTimersByTimeAsync(240_000);
      expect(service.flow().error).toBe('session-ended');
      await vi.advanceTimersByTimeAsync(60_000);
      expect(tokens.renew).toHaveBeenCalledOnce();
    });
  });

  it('al salir apaga la cámara y cierra la conexión', async () => {
    await started();
    service.stop();
    expect(camera.close).toHaveBeenCalled();
    expect(sockets[0].closed).toBe(1000);
  });

  it('usa los marcadores del resultado', async () => {
    await started();
    sockets[0].say({
      type: 'result',
      frame_number: 1,
      frame: frame({ markers: ALL_MARKERS.slice(0, 3), board_found: false }),
    });
    expect(service.flow().markers.phrase).toBe('Falta el de abajo a la izquierda.');
  });
});

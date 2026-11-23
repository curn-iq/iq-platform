import { TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { CameraError, CameraService, cameraErrorKind, MEDIA_DEVICES } from './camera.service';

function fakeStream() {
  const stop = vi.fn();
  const stream = {
    active: true,
    getTracks: () => [{ stop }],
  } as unknown as MediaStream;
  return { stream, stop };
}

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('CameraService', () => {
  type GetUserMedia = (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
  let getUserMedia: Mock<GetUserMedia>;
  let streams: ReturnType<typeof fakeStream>[];

  function create(withDevices = true) {
    TestBed.configureTestingModule({
      providers: [{ provide: MEDIA_DEVICES, useValue: withDevices ? { getUserMedia } : undefined }],
    });
    return TestBed.inject(CameraService);
  }

  beforeEach(() => {
    streams = [];
    getUserMedia = vi.fn<GetUserMedia>(() => {
      const made = fakeStream();
      streams.push(made);
      return Promise.resolve(made.stream);
    });
  });

  afterEach(() => {
    delete (document as { hidden?: boolean }).hidden;
  });

  it('abre la cámara trasera, sin audio', async () => {
    const camera = create();
    const stream = await camera.open();
    expect(stream).toBe(streams[0].stream);
    expect(camera.stream()).toBe(stream);
    const constraints = getUserMedia.mock.calls[0][0] as MediaStreamConstraints;
    expect(constraints.audio).toBe(false);
    expect((constraints.video as MediaTrackConstraints).facingMode).toEqual({
      ideal: 'environment',
    });
  });

  it('abrirla dos veces seguidas pide el permiso una sola vez', async () => {
    const camera = create();
    const [a, b] = await Promise.all([camera.open(), camera.open()]);
    expect(a).toBe(b);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('un permiso negado es «cámara bloqueada»', async () => {
    getUserMedia.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    const camera = create();
    const error = await camera.open().catch((e) => e);
    expect(error).toBeInstanceOf(CameraError);
    expect(error.kind).toBe('camera-blocked');
    expect(camera.stream()).toBeNull();
  });

  it('un equipo sin cámara es «equipo sin cámara»', async () => {
    getUserMedia.mockRejectedValue(new DOMException('no hay', 'NotFoundError'));
    const camera = create();
    expect((await camera.open().catch((e) => e)).kind).toBe('no-camera');
  });

  it('sin mediaDevices (fuera de HTTPS) tampoco hay cámara', async () => {
    const camera = create(false);
    expect((await camera.open().catch((e) => e)).kind).toBe('no-camera');
  });

  it('cameraErrorKind distingue el permiso negado de lo demás', () => {
    expect(cameraErrorKind({ name: 'NotAllowedError' })).toBe('camera-blocked');
    expect(cameraErrorKind({ name: 'SecurityError' })).toBe('camera-blocked');
    expect(cameraErrorKind({ name: 'NotReadableError' })).toBe('no-camera');
    expect(cameraErrorKind(null)).toBe('no-camera');
  });

  it('cerrarla apaga todas sus pistas', async () => {
    const camera = create();
    await camera.open();
    camera.close();
    expect(streams[0].stop).toHaveBeenCalledOnce();
    expect(camera.stream()).toBeNull();
  });

  it('si se cierra mientras se pide el permiso, no queda abierta', async () => {
    const camera = create();
    const opening = camera.open().catch((e) => e);
    camera.close();
    await opening;
    expect(streams[0].stop).toHaveBeenCalledOnce();
    expect(camera.stream()).toBeNull();
  });

  it('al ocultarse la pestaña se apaga, y al volver se abre otra vez sola', async () => {
    const camera = create();
    await camera.open();
    setHidden(true);
    expect(streams[0].stop).toHaveBeenCalledOnce();
    expect(camera.stream()).toBeNull();

    setHidden(false);
    await vi.waitFor(() => expect(camera.stream()).toBe(streams[1].stream));
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('si la pestaña se oculta mientras se pide el permiso, no queda encendida', async () => {
    let grant!: () => void;
    getUserMedia.mockImplementationOnce(() => {
      const made = fakeStream();
      streams.push(made);
      return new Promise((resolve) => (grant = () => resolve(made.stream)));
    });
    const camera = create();
    const opening = camera.open();
    setHidden(true);
    grant();
    await vi.waitFor(() => expect(streams[0].stop).toHaveBeenCalledOnce());
    expect(camera.stream()).toBeNull();

    setHidden(false);
    expect(await opening).toBe(streams[1].stream);
    expect(camera.stream()).toBe(streams[1].stream);
  });

  it('si ya se cerró, volver a la pestaña no la abre', async () => {
    const camera = create();
    await camera.open();
    camera.close();
    setHidden(true);
    setHidden(false);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('si al volver a la pestaña ya no puede abrirla, lo dice en `failure`', async () => {
    const camera = create();
    await camera.open();
    setHidden(true);
    getUserMedia.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    setHidden(false);
    await vi.waitFor(() => expect(camera.failure()?.kind).toBe('camera-blocked'));
  });
});

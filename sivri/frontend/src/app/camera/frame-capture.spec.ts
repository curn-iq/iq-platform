import { captureFrame, FRAME_LONG_SIDE, FRAME_QUALITY, scaledSize } from './frame-capture';

describe('scaledSize', () => {
  it('reduce a 640 px el lado mayor y conserva la proporción', () => {
    expect(scaledSize(1280, 720)).toEqual({ width: 640, height: 360 });
    expect(scaledSize(720, 1280)).toEqual({ width: 360, height: 640 });
    expect(scaledSize(1920, 1080)).toEqual({ width: 640, height: 360 });
  });

  it('nunca agranda un cuadro que ya es chico', () => {
    expect(scaledSize(320, 240)).toEqual({ width: 320, height: 240 });
    expect(scaledSize(640, 480)).toEqual({ width: 640, height: 480 });
  });

  it('redondea a píxeles enteros', () => {
    const size = scaledSize(1000, 333);
    expect(Number.isInteger(size.width) && Number.isInteger(size.height)).toBe(true);
    expect(size.width).toBe(FRAME_LONG_SIDE);
  });
});

describe('captureFrame', () => {
  const video = (videoWidth: number, videoHeight: number) =>
    ({ videoWidth, videoHeight }) as unknown as HTMLVideoElement;

  it('sin imagen todavía (el video no cargó) no hay cuadro', async () => {
    expect(await captureFrame(video(0, 0))).toBeNull();
  });

  describe('con un canvas', () => {
    const drawImage = vi.fn();
    const toBlob = vi.fn((callback: BlobCallback, _type?: string, _quality?: number) =>
      callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
    );

    beforeEach(() => {
      drawImage.mockClear();
      toBlob.mockClear();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage,
      } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob);
    });

    afterEach(() => vi.restoreAllMocks());

    it('dibuja el cuadro entero reducido y lo saca como JPEG de calidad 0,75', async () => {
      const source = video(1280, 720);
      const frame = await captureFrame(source);
      expect(drawImage).toHaveBeenCalledWith(source, 0, 0, 640, 360);
      expect(toBlob.mock.calls[0][1]).toBe('image/jpeg');
      expect(toBlob.mock.calls[0][2]).toBe(FRAME_QUALITY);
      expect(frame).toMatchObject({ width: 640, height: 360 });
      expect(frame?.blob.type).toBe('image/jpeg');
    });

    it('si el navegador no logra el JPEG, no hay cuadro', async () => {
      toBlob.mockImplementationOnce((callback) => callback(null));
      expect(await captureFrame(video(1280, 720))).toBeNull();
    });
  });
});

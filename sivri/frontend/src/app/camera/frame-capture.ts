/**
 * Lo que se manda al backend: el cuadro completo del video (sin recortar), reducido, como
 * JPEG. Medido en el Servidor PC1 por Tailscale Funnel (`sivri/backend/README.md`, «Tamaño del
 * cuadro por Funnel»): a 640 px de lado mayor y calidad 0,75, un cuadro pesa unos 45 kB y la
 * respuesta tarda una mediana de 248 ms; a 960 px pesa el doble y tarda más.
 */
export const FRAME_LONG_SIDE = 640;
export const FRAME_QUALITY = 0.75;

export interface CapturedFrame {
  /** El JPEG que se manda. */
  readonly blob: Blob;
  /** Su tamaño en píxeles (el del cuadro reducido): la proporción es la del video. */
  readonly width: number;
  readonly height: number;
}

/** El tamaño reducido para que el lado mayor sea `longSide`; nunca agranda. */
export function scaledSize(
  width: number,
  height: number,
  longSide = FRAME_LONG_SIDE,
): { width: number; height: number } {
  const scale = Math.min(1, longSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Lo mínimo que se necesita de un `<video>`: lo que se ve y de qué tamaño es. */
export type FrameSource = Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'> & CanvasImageSource;

let canvas: HTMLCanvasElement | undefined;

/**
 * Saca el cuadro actual del video como JPEG de calidad 0,75 y 640 px de lado mayor. `null` si
 * el video todavía no tiene imagen. El `canvas` se reutiliza entre cuadros.
 */
export function captureFrame(video: FrameSource): Promise<CapturedFrame | null> {
  if (!video.videoWidth || !video.videoHeight) return Promise.resolve(null);
  const { width, height } = scaledSize(video.videoWidth, video.videoHeight);
  canvas ??= document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve(null);
  context.drawImage(video, 0, 0, width, height);
  return new Promise((resolve) =>
    canvas!.toBlob(
      (blob) => resolve(blob ? { blob, width, height } : null),
      'image/jpeg',
      FRAME_QUALITY,
    ),
  );
}

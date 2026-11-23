import { environment } from '../environments/environment';

/** El código de SIVRI: la AGPL-3.0 obliga a ofrecerlo a quien lo usa por internet (el mismo de `GET /health`). */
export const SOURCE_URL = 'https://github.com/curn-iq/iq-platform/tree/main/sivri';

/**
 * Los cuatro marcadores ArUco para imprimir (`DICT_4X4_50`, ids 0 a 3): el archivo
 * `marcadores-aruco.pdf` de la carpeta de SIVRI, en recursos, del Drive del proyecto.
 */
export const MARKERS_PDF_URL =
  'https://drive.google.com/file/d/1BNHICBubIc2He6lBQdrsrcgJliCok9H1/view';

/** Una página del shell de DataIQ: es otra app, así que el enlace es una navegación completa. */
export function shellUrl(path: string): string {
  return `${environment.shellUrl}${path}`;
}

/** Las técnicas de DataIQ. */
export const TECHNIQUES_URL = shellUrl('/tecnicas');

/** La mesa de Mayo de una técnica en DataIQ: la mesa de referencia. */
export function referenceTableUrl(techniqueId: string): string {
  return shellUrl(`/tecnicas/${encodeURIComponent(techniqueId)}/mesa-de-mayo`);
}

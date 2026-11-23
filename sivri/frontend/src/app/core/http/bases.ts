/** Por dónde se llega a DataIQ: el mismo origen, por el proxy o el rewrite (sin CORS). */
export const DATAIQ_BASE = '/api/dataiq';

/** ¿La petición es a DataIQ? Lo que vale para DataIQ (cookie, `X-IQ-Client`, 401) no vale para SIVRI. */
export function isDataIQRequest(url: string): boolean {
  return url === DATAIQ_BASE || url.startsWith(`${DATAIQ_BASE}/`);
}

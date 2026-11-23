/**
 * Lo que cambia entre producción y desarrollo. En producción SIVRI se sirve bajo
 * `/sivri/` en el mismo origen que el shell, así que sus páginas (el ingreso, las
 * mesas de referencia) son rutas del mismo sitio.
 */
export const environment = {
  /** Origen del shell; vacío es el mismo origen que esta app. */
  shellUrl: '',
  /**
   * El backend de SIVRI, directo y no por el mismo origen: Vercel no pasa
   * WebSockets. Es la vista previa del Servidor PC1 (Tailscale Funnel); la del
   * piloto está por definir (`sivri/docs/checklist-frontend.md`, «Dependencias de
   * otros»). Al cambiarla, también va en el `connect-src` de `vercel.json`.
   */
  sivriApiUrl: 'https://fedora.tail5cf085.ts.net:8443',
  sivriSocketUrl: 'wss://fedora.tail5cf085.ts.net:8443/ws/validate',
  /** La dirección pública de SIVRI, la que lleva el código QR de la página del computador. */
  publicUrl: 'https://dataiq-frontend.vercel.app/sivri',
};

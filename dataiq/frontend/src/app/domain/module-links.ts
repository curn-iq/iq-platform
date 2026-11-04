/**
 * A dónde llevan «Ver en 3D» y «Comprobar con la cámara». SIMIQ3D y SIVRI son apps aparte
 * que se sirven en el mismo origen que esta, bajo `/simiq3d/` y `/sivri/` (Resuelto 17 de
 * `dataiq/docs/checklist-frontend.md`): se entra con navegación completa, no con el router.
 */

/** La mesa de Mayo de la técnica en SIMIQ3D (`simiq3d/frontend/README.md`, «Rutas»). */
export function simiq3dTechniqueUrl(techniqueId: string): string {
  return `/simiq3d/tecnicas/${encodeURIComponent(techniqueId)}`;
}

/** SIVRI: reconoce la técnica sola, así que no lleva la técnica en la dirección. */
export const SIVRI_URL = '/sivri/';

/** `/simiq3d` o `/sivri`, solos o seguidos de `/`, `?` o `#`: `/simiq3dx` no es un módulo. */
const MODULE_ROUTE = /^\/(?:simiq3d|sivri)(?:[/?#]|$)/;

/**
 * Si la ruta es de SIMIQ3D o de SIVRI. El router de esta app no las conoce: a ellas se va con
 * navegación completa, para que el servidor (el rewrite de Vercel) entregue la app del módulo.
 */
export function isModuleUrl(url: string): boolean {
  return MODULE_ROUTE.test(url);
}

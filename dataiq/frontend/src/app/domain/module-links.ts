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

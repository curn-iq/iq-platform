/** Lo que dice el titular de «Técnica nueva» mientras no se haya escrito el nombre. */
export const NEW_TECHNIQUE_TITLE = 'Técnica nueva';

/** Lo que dice bajo el nombre cuando la API responde 409: ya hay una técnica así en la especialidad. */
export const TECHNIQUE_NAME_TAKEN = 'Ya hay una técnica con ese nombre en la especialidad.';

/** El titular de «Técnica nueva»: sigue lo que se escribe en el nombre (Resuelto 28 y «Editor de técnica» de `DESIGN.md`). */
export function newTechniqueTitle(name: string): string {
  return name.trim() || NEW_TECHNIQUE_TITLE;
}

/**
 * Si ya se puede crear la técnica: tiene un nombre (no en blanco) y una especialidad elegida.
 * Desde que se crea, el nombre y la especialidad son de solo lectura (Resuelto 28), así que no
 * se crea con lo que falta ni mientras se escribe.
 */
export function isReadyToCreate(name: string, specialtyId: string): boolean {
  return name.trim() !== '' && specialtyId !== '';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `true` si el texto tiene la forma de un UUID (los ids de DataIQ lo son). Sirve
 * para no pedir a la API un id que no puede existir, porque respondería 422 y se
 * avisaría como un error en vez de decir que la técnica no existe.
 */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

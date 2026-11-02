import { plain } from './technique-search';

/**
 * Suma un nombre a una lista de equipos o de equipo médico-quirúrgico. Va sin los espacios de los
 * extremos, y un nombre en blanco o que ya está (sin distinguir mayúsculas ni tildes) no se suma: la API
 * rechaza una lista con un nombre repetido (422) y tumbaría el autoguardado de todo lo demás. Devuelve
 * una lista nueva.
 */
export function addName(names: readonly string[], name: string): string[] {
  const clean = name.trim();
  if (clean === '' || names.some((existing) => plain(existing) === plain(clean))) {
    return [...names];
  }
  return [...names, clean];
}

/** La lista sin el nombre de esa posición. Una posición que no existe deja la lista igual. */
export function removeName(names: readonly string[], index: number): string[] {
  return names.filter((_, position) => position !== index);
}

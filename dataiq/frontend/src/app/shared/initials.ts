/**
 * Las iniciales de un nombre para el avatar: la primera letra de las dos
 * primeras palabras, en mayúscula («Mauricio Lugo Granados» → «ML»). Con una sola
 * palabra, solo su inicial; sin nombre, «?».
 */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]);
  return letters.length ? letters.join('').toLocaleUpperCase('es') : '?';
}

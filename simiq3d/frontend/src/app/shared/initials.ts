/**
 * Las iniciales de un nombre para el avatar: la primera letra de las dos
 * primeras palabras, en mayúscula. Es la misma regla del frontend de DataIQ.
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

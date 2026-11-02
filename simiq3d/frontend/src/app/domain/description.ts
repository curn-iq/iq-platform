/**
 * La primera oración de una descripción de DataIQ y el resto. La ficha muestra
 * la primera a simple vista y el resto con «Ver más». Se corta donde termina
 * una oración (punto, espacio y mayúscula), así que «N.° 3» o «14 cm de largo»
 * no la cortan. No se reescribe nada: las dos partes son el texto de DataIQ.
 */
export function splitLead(text: string): { lead: string; rest: string } {
  const end = /\.\s+(?=[«¿¡(]?[A-ZÁÉÍÓÚÜÑ])/u.exec(text);
  if (!end) return { lead: text.trim(), rest: '' };
  return {
    lead: text.slice(0, end.index + 1).trim(),
    rest: text.slice(end.index + end[0].length).trim(),
  };
}

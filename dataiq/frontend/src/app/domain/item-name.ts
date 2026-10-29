/**
 * Lo que dice la leyenda de un objeto de la mesa: los nombres de sus
 * componentes del catálogo, unidos con «y» («Mango de bisturí N.° 3 y Hoja de
 * bisturí #15»), sin tocar sus mayúsculas. La API no trae un nombre por objeto.
 * Si no tiene componentes, lo único que hay es lo que escribió la fuente.
 */
export function itemName(components: readonly string[], sourceText: string): string {
  if (components.length === 0) return sourceText;
  if (components.length === 1) return components[0];
  return `${components.slice(0, -1).join(', ')} y ${components[components.length - 1]}`;
}

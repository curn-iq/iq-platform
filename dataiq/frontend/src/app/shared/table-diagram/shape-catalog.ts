import { DRAWINGS, type DrawingKey } from './drawings';

/** Una forma que el diagrama pone en la mesa: acero, plano, o un recuadro punteado sin dibujo. */
export type Shape = { kind: 'steel' | 'flat'; key: DrawingKey } | { kind: 'unknown'; key: null };

/**
 * Palabras del nombre del componente que dicen qué dibujo le toca, como la
 * tabla de `instrumental.html`. Se comparan sin tildes ni mayúsculas. Lo que no
 * está aquí no tiene dibujo propio: no se le presta el de otro instrumento.
 */
const KEYWORDS: readonly (readonly [string, DrawingKey])[] = [
  ['metzenbaum', 'metzenbaum'],
  ['tijera de mayo', 'mayo'],
  ['tijera de energia', 'energia'],
  ['mango de bisturi', 'bisturi'],
  // La hoja va dibujada con su mango
  ['hoja de bisturi', 'bisturi'],
  ['diseccion', 'diseccion'],
  ['farabeuf', 'farabeuf'],
  ['senn', 'senn'],
  ['allis', 'allis'],
  ['lahey', 'lahey'],
  ['rochester', 'rochester'],
  ['mosquito', 'mosquito'],
  ['kelly', 'kelly'],
  ['cistica', 'cistica'],
  ['portaagujas', 'portaagujas'],
  ['pinza de campo', 'campo'],
  ['frazier', 'frazier'],
  ['paquete de ropa', 'ropa'],
  ['compresa', 'compresas'],
  ['gasa', 'compresas'],
  ['bandeja', 'bandeja'],
  ['caucho de succion', 'caucho'],
];

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** El dibujo de un componente del catálogo, o `null` si no tiene uno propio. */
export function drawingFor(name: string): DrawingKey | null {
  const normalized = normalize(name);
  return KEYWORDS.find(([word]) => normalized.includes(word))?.[1] ?? null;
}

/**
 * Las formas de un objeto, a partir de los nombres de sus componentes. Cada
 * dibujo aparece una sola vez («Mango de bisturí» y «Hoja de bisturí» son un
 * bisturí; «con garra» y «sin garra», una pinza de disección). Una compresa con
 * portaagujas es la compresa con su hilo. Un componente sin dibujo suma un solo
 * recuadro punteado, y un objeto sin componentes tampoco inventa un dibujo.
 */
export function shapesFor(components: readonly string[]): Shape[] {
  const keys = components.map(drawingFor);
  const holdsNeedle = keys.includes('portaagujas');
  const shapes: Shape[] = [];
  const seen = new Set<DrawingKey>();
  for (const found of keys) {
    if (found === null) continue;
    const key = found === 'compresas' && holdsNeedle ? 'compresaPorta' : found;
    if (seen.has(key)) continue;
    seen.add(key);
    shapes.push({ kind: DRAWINGS[key].kind, key });
  }
  if (keys.length === 0 || keys.includes(null)) shapes.push({ kind: 'unknown', key: null });
  return shapes;
}

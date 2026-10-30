import { DRAWINGS, type DrawingKey, type FlatKey, type SteelKey } from './drawings';

/** Una forma que el diagrama pone en la mesa: acero, plano, o un recuadro punteado sin dibujo. */
export type Shape =
  | { kind: 'steel'; key: SteelKey }
  | { kind: 'flat'; key: FlatKey }
  | { kind: 'unknown'; key: null };

/**
 * Palabras del nombre del componente que dicen qué dibujo le toca, como la
 * tabla de `instrumental.html`. Se comparan sin tildes ni mayúsculas. Lo que no
 * está aquí no tiene dibujo propio: no se le presta el de otro instrumento.
 */
const KEYWORDS: readonly (readonly [string, DrawingKey])[] = [
  ['metzenbaum', 'metzenbaum'],
  ['tijera de mayo', 'mayo'],
  ['tijera de energia', 'energy'],
  ['mango de bisturi', 'scalpel'],
  // La hoja va dibujada con su mango
  ['hoja de bisturi', 'scalpel'],
  ['diseccion', 'dissecting'],
  ['farabeuf', 'farabeuf'],
  ['senn', 'senn'],
  ['allis', 'allis'],
  ['lahey', 'lahey'],
  ['rochester', 'rochester'],
  ['mosquito', 'mosquito'],
  ['kelly', 'kelly'],
  ['cistica', 'cystic'],
  ['portaagujas', 'needleHolder'],
  ['pinza de campo', 'towelClamp'],
  ['frazier', 'frazier'],
  ['paquete de ropa', 'drapePack'],
  ['compresa', 'sponges'],
  ['gasa', 'sponges'],
  ['bandeja', 'tray'],
  ['caucho de succion', 'suctionTubing'],
];

/**
 * Los dibujos son del instrumental de cirugía abierta: uno laparoscópico
 * («Portaagujas laparoscópico») no se parece al abierto de su mismo nombre.
 */
const OTHER_FAMILY = 'laparoscop';

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** El dibujo de un componente del catálogo, o `null` si no tiene uno propio. */
export function drawingFor(name: string): DrawingKey | null {
  const normalized = normalize(name);
  if (normalized.includes(OTHER_FAMILY)) return null;
  return KEYWORDS.find(([word]) => normalized.includes(word))?.[1] ?? null;
}

function shapeOf(key: DrawingKey): Shape {
  return DRAWINGS[key].kind === 'steel'
    ? { kind: 'steel', key: key as SteelKey }
    : { kind: 'flat', key: key as FlatKey };
}

/**
 * Las formas de un objeto, a partir de los nombres de sus instrumentos (sin sus
 * suturas: el hilo no se dibuja solo). Cada dibujo aparece una sola vez («Mango
 * de bisturí» y «Hoja de bisturí» son un bisturí; «con garra» y «sin garra», una
 * pinza de disección). Una compresa con portaagujas es la compresa con su hilo.
 * Un instrumento sin dibujo suma un solo recuadro punteado, y un objeto sin
 * instrumentos tampoco inventa un dibujo.
 */
export function shapesFor(instruments: readonly string[]): Shape[] {
  const keys = instruments.map(drawingFor);
  const holdsNeedle = keys.includes('needleHolder');
  const shapes: Shape[] = [];
  const seen = new Set<DrawingKey>();
  for (const found of keys) {
    if (found === null) continue;
    const key = found === 'sponges' && holdsNeedle ? 'threadedSponge' : found;
    if (seen.has(key)) continue;
    seen.add(key);
    shapes.push(shapeOf(key));
  }
  if (keys.length === 0 || keys.includes(null)) shapes.push({ kind: 'unknown', key: null });
  return shapes;
}

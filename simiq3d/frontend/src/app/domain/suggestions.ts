import type { TableItem } from './mayo-table';

/**
 * Las sugerencias para empezar a preguntar: tres preguntas armadas con nombres
 * de DataIQ, para que siempre tengan respuesta (como las opciones que arma el
 * backend). Sin técnica abierta, sobre las técnicas que se pueden ver; con una
 * abierta, sobre su mesa.
 */
export function suggestions(
  techniques: readonly string[],
  open?: { name: string; items: readonly TableItem[] },
): string[] {
  if (!open) {
    const [first, second, third] = techniques;
    return [
      first && `Muéstrame la mesa de ${first}`,
      second && `¿Para qué sirve ${withArticle(second)}?`,
      third && `¿Qué lleva la mesa de ${third}?`,
    ].filter((question): question is string => Boolean(question));
  }
  // Los objetos de un solo instrumento, que se nombran solos («la Pinza Kelly»)
  const single = open.items.filter((item) => item.instrumentIds.length === 1);
  return [
    single[0] && `¿Dónde va ${withArticle(single[0].name)}?`,
    single[1] && `¿Qué es ${withArticle(single[1].name)}?`,
    `¿Cuáles son las indicaciones de ${withArticle(open.name)}?`,
  ].filter((question): question is string => Boolean(question));
}

/**
 * El nombre con su artículo: «la» si la primera palabra termina en a («la
 * Pinza Kelly», «la Mastectomía»), si no «el» («el Separador de Farabeuf», «el
 * Portaagujas»). Basta para el instrumental y las técnicas del catálogo.
 */
export function withArticle(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return `${first.toLowerCase().endsWith('a') ? 'la' : 'el'} ${name.trim()}`;
}

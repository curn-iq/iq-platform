import type { TechniqueGroup } from './technique-groups';

/**
 * El texto sin tildes ni mayúsculas, **letra por letra**: el resultado mide lo
 * mismo que el texto en NFC, así que un índice del uno vale en el otro (para
 * resaltar lo que coincide con la búsqueda sin importar las tildes). Primero se
 * compone: una «í» pegada de un PDF o de macOS puede venir como «i» más su tilde.
 */
export function plain(text: string): string {
  return Array.from(text.normalize('NFC'), plainLetter).join('');
}

/** Una letra sin tilde ni mayúscula, de igual largo: un emoji son dos unidades y las conserva. */
function plainLetter(letter: string): string {
  const [base] = Array.from(letter.normalize('NFD'));
  const lower = base.toLowerCase();
  return lower.length === letter.length ? lower : letter;
}

/** Un tramo de un nombre; `match` es el que coincide con la búsqueda. */
export interface Segment {
  text: string;
  match: boolean;
}

/** El nombre partido en lo que coincide con la búsqueda (la primera vez) y lo demás. */
export function highlight(text: string, query: string): Segment[] {
  const composed = text.normalize('NFC');
  const needle = plain(query.trim());
  const start = needle ? plain(composed).indexOf(needle) : -1;
  if (start === -1) return [{ text, match: false }];
  const end = start + needle.length;
  return [
    { text: composed.slice(0, start), match: false },
    { text: composed.slice(start, end), match: true },
    { text: composed.slice(end), match: false },
  ].filter((segment) => segment.text !== '');
}

export interface CatalogFilter {
  /** El nombre de la especialidad elegida, o `null` para todas. */
  specialty: string | null;
  /** Lo que se busca: una técnica o una especialidad, sin importar tildes ni mayúsculas. */
  query: string;
}

/**
 * Lo que muestra el catálogo: dentro de la especialidad elegida (o de todas), las
 * técnicas cuyo nombre contiene la búsqueda; si la búsqueda es el nombre de una
 * especialidad (o parte de él), todas las suyas. Sin técnicas, el grupo no se
 * muestra.
 */
export function filterGroups<T extends { name: string }>(
  groups: readonly TechniqueGroup<T>[],
  { specialty, query }: CatalogFilter,
): TechniqueGroup<T>[] {
  const needle = plain(query.trim());
  return groups
    .filter((group) => specialty === null || group.specialty === specialty)
    .map((group) => {
      const byGroup = needle !== '' && plain(group.specialty).includes(needle);
      return {
        specialty: group.specialty,
        techniques: group.techniques.filter(
          (technique) => needle === '' || byGroup || plain(technique.name).includes(needle),
        ),
      };
    })
    .filter((group) => group.techniques.length > 0);
}

import { VERSION_SECTIONS } from './editor-steps';
import { ZONE_NAMES } from './table';
import type { SectionKey } from './version-progress';

/**
 * Sobre qué es un comentario de la revisión (Resuelto 60 de `dataiq/docs/checklist-frontend.md`): una
 * sección entera, un campo de Datos clínicos o un objeto de una mesa. Nunca una celda vacía.
 */
export type CommentTarget =
  | { kind: 'section'; section: SectionKey }
  | { kind: 'field'; key: string; label: string }
  | { kind: 'object'; section: 'mayo' | 'reserve'; number: number | null; name: string };

/** Un comentario escrito por el revisor, que solo vive en pantalla hasta que devuelve la versión. */
export interface ReviewComment {
  id: number;
  target: CommentTarget;
  text: string;
}

/** La sección de la versión a la que pertenece un comentario: un campo clínico es de Datos clínicos. */
export function targetSection(target: CommentTarget): SectionKey {
  return target.kind === 'section'
    ? target.section
    : target.kind === 'field'
      ? 'clinical'
      : target.section;
}

function sectionName(section: SectionKey): string {
  return VERSION_SECTIONS.find((candidate) => candidate.key === section)!.name;
}

/** Los saltos de línea de un texto pasan a espacios: el motivo lleva una línea por comentario. */
export function flattenLines(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').trim();
}

/** De qué trata un comentario, para decirlo en «Comentario sobre …»: la sección, el campo o el nombre del objeto. */
export function commentSubject(target: CommentTarget): string {
  switch (target.kind) {
    case 'section':
      return 'la sección';
    case 'field':
      return target.label;
    case 'object':
      return target.name;
  }
}

/**
 * La línea del motivo de un comentario (Resuelto 18 y 60): un objeto de la mesa lleva su mesa, su
 * número y su nombre («Mesa de Mayo · 6 Separador de Senn Miller: …»; sin número, «Mesa de Mayo ·
 * Gasa: …»), un campo clínico, «Datos clínicos · Anestesia: …» y una sección, «Mesa de Mayo: …».
 */
export function commentLine(comment: ReviewComment): string {
  const { target } = comment;
  const text = flattenLines(comment.text);
  switch (target.kind) {
    case 'section':
      return `${sectionName(target.section)}: ${text}`;
    case 'field':
      return `${sectionName('clinical')} · ${target.label}: ${text}`;
    case 'object': {
      const zone = ZONE_NAMES[target.section];
      const who = target.number === null ? target.name : `${target.number} ${target.name}`;
      return `${zone} · ${who}: ${text}`;
    }
  }
}

/** Los comentarios en el orden de las secciones, y dentro de cada una en el que se escribieron. */
export function sortedComments(comments: readonly ReviewComment[]): ReviewComment[] {
  const order = (comment: ReviewComment) =>
    VERSION_SECTIONS.findIndex((section) => section.key === targetSection(comment.target));
  return [...comments].sort((a, b) => order(a) - order(b) || a.id - b.id);
}

/**
 * El motivo con el que se devuelve una versión (`reason` de `POST /versions/{id}/reject`, Resuelto 18
 * y 60): primero «Nota general: …» si se escribió, y después una línea por comentario. Vacío si no
 * hay nota ni comentarios.
 */
export function buildReason(comments: readonly ReviewComment[], generalNote: string): string {
  const note = flattenLines(generalNote);
  const lines = sortedComments(comments)
    .filter((comment) => flattenLines(comment.text) !== '')
    .map(commentLine);
  return [...(note === '' ? [] : [`Nota general: ${note}`]), ...lines].join('\n');
}

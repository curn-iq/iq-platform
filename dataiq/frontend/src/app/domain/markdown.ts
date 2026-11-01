/**
 * Un Markdown mínimo, el que usa `docs/privacidad.md`: titulares, párrafos, listas
 * (con viñetas o numeradas), tablas, negrita, cursiva y enlaces. Devuelve nodos y
 * no HTML: quien los dibuja es una plantilla de Angular, así que el texto nunca
 * pasa por `innerHTML`.
 */

/** Un trozo de texto de una línea. */
export type Inline =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'strong'; readonly text: string }
  | { readonly type: 'em'; readonly text: string }
  | { readonly type: 'link'; readonly text: string; readonly href: string };

export type Block =
  | { readonly type: 'heading'; readonly level: number; readonly inlines: Inline[] }
  | { readonly type: 'paragraph'; readonly inlines: Inline[] }
  | { readonly type: 'list'; readonly ordered: boolean; readonly items: Inline[][] }
  | { readonly type: 'table'; readonly header: Inline[][]; readonly rows: Inline[][][] };

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^-\s+(.*)$/;
const NUMBERED = /^\d+\.\s+(.*)$/;
const TABLE_ROW = /^\|.*\|$/;
const TABLE_RULE = /^\|(\s*:?-+:?\s*\|)+$/;
// Negrita, cursiva (el asterisco no puede tener un espacio pegado: «2 * 3» no es cursiva) o enlace.
const INLINE = /\*\*([^*]+)\*\*|\*([^*\s][^*]*?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
// Solo se enlaza a la web o a un correo; cualquier otro destino queda como texto.
const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

/** Lee el Markdown y devuelve sus bloques, en orden. */
export function parseMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | undefined;
  let table: string[] = [];

  const flush = (): void => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', inlines: parseInlines(paragraph.join(' ')) });
    }
    if (list) {
      blocks.push({
        type: 'list',
        ordered: list.ordered,
        items: list.items.map(parseInlines),
      });
    }
    if (table.length) blocks.push(toTable(table));
    paragraph = [];
    list = undefined;
    table = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1].length, inlines: parseInlines(heading[2]) });
      continue;
    }

    if (TABLE_ROW.test(line)) {
      if (!table.length) flush();
      table.push(line);
      continue;
    }

    const item = BULLET.exec(line) ?? NUMBERED.exec(line);
    if (item && !/^\s/.test(raw)) {
      const ordered = !BULLET.test(line);
      if (list?.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push(item[1]);
      continue;
    }

    // Una línea con sangría que sigue a un elemento de lista continúa ese elemento.
    if (list && /^\s/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line}`;
      continue;
    }

    if (list || table.length) flush();
    paragraph.push(line);
  }
  flush();
  return blocks;
}

function toTable(rows: string[]): Block {
  const cells = rows
    .filter((row) => !TABLE_RULE.test(row))
    .map((row) =>
      row
        .slice(1, -1)
        .split('|')
        .map((cell) => parseInlines(cell.trim())),
    );
  return { type: 'table', header: cells[0] ?? [], rows: cells.slice(1) };
}

function parseInlines(text: string): Inline[] {
  const inlines: Inline[] = [];
  const addText = (value: string): void => {
    if (!value) return;
    const last = inlines[inlines.length - 1];
    if (last?.type === 'text') {
      inlines[inlines.length - 1] = { type: 'text', text: last.text + value };
    } else {
      inlines.push({ type: 'text', text: value });
    }
  };
  let from = 0;
  for (const match of text.matchAll(INLINE)) {
    addText(text.slice(from, match.index));
    from = match.index + match[0].length;
    if (match[1] !== undefined) inlines.push({ type: 'strong', text: match[1] });
    else if (match[2] !== undefined) inlines.push({ type: 'em', text: match[2] });
    else if (SAFE_LINK.test(match[4]))
      inlines.push({ type: 'link', text: match[3], href: match[4] });
    else addText(match[3]);
  }
  addText(text.slice(from));
  return inlines;
}

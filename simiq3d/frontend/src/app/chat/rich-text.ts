import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Un tramo de texto, en negrita o no. */
export interface Span {
  text: string;
  bold: boolean;
}

/** Un elemento de una lista numerada: su número tal como viene (el del diagrama de IQ) y sus tramos. */
export interface NumberedItem {
  number: number;
  spans: Span[];
}

/** Un párrafo, o una lista con viñetas o numerada (cada elemento, sus tramos). */
export type Block =
  | { kind: 'p'; spans: Span[] }
  | { kind: 'ul'; items: Span[][] }
  | { kind: 'ol'; items: NumberedItem[] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;

/** Los tramos de una línea: `**así**` es negrita. Un `**` sin cerrar se deja como está. */
export function spansOf(line: string): Span[] {
  const spans: Span[] = [];
  const parts = line.split(/\*\*(.+?)\*\*/g);
  parts.forEach((text, i) => {
    if (text) spans.push({ text, bold: i % 2 === 1 });
  });
  return spans;
}

/**
 * El Markdown sencillo que escribe el tutor de SIMIQ3D (`ChatOut.reply`): párrafos
 * separados por una línea en blanco, listas con «- » o «1. » y negrita con `**`.
 * Nada más: ni enlaces, ni títulos, ni HTML. Se arma como datos, no como HTML,
 * así que el texto nunca se interpreta como marcado.
 */
export function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const closeParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'p', spans: spansOf(paragraph.join('\n')) });
    paragraph = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.replace(/^#+\s+/, '');
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet || numbered) closeParagraph();
    const last = blocks.at(-1);
    if (bullet) {
      if (last?.kind === 'ul') last.items.push(spansOf(bullet[1]));
      else blocks.push({ kind: 'ul', items: [spansOf(bullet[1])] });
    } else if (numbered) {
      // Cada número se respeta: en la mesa, es el del diagrama y no tiene por qué ir seguido.
      const item = { number: Number(numbered[1]), spans: spansOf(numbered[2]) };
      if (last?.kind === 'ol') last.items.push(item);
      else blocks.push({ kind: 'ol', items: [item] });
    } else if (line.trim()) {
      paragraph.push(line.trim());
    } else {
      closeParagraph();
      // Una línea en blanco corta la lista: la siguiente empieza otra.
      blocks.push({ kind: 'p', spans: [] });
    }
  }
  closeParagraph();
  return blocks.filter((b) => b.kind !== 'p' || b.spans.length);
}

/** El texto sin marcas, en una línea: para la última respuesta encima del campo (celular). */
export function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

/** El texto de una respuesta del chat, con sus párrafos, listas y negritas. */
@Component({
  selector: 'app-rich-text',
  template: `
    @for (block of blocks(); track $index) {
      @switch (block.kind) {
        @case ('p') {
          <p>
            @for (span of block.spans; track $index) {
              @if (span.bold) {
                <strong>{{ span.text }}</strong>
              } @else {
                {{ span.text }}
              }
            }
          </p>
        }
        @case ('ul') {
          <ul>
            @for (item of block.items; track $index) {
              <li>
                @for (span of item; track $index) {
                  @if (span.bold) {
                    <strong>{{ span.text }}</strong>
                  } @else {
                    {{ span.text }}
                  }
                }
              </li>
            }
          </ul>
        }
        @case ('ol') {
          <ol>
            @for (item of block.items; track $index) {
              <li [value]="item.number">
                @for (span of item.spans; track $index) {
                  @if (span.bold) {
                    <strong>{{ span.text }}</strong>
                  } @else {
                    {{ span.text }}
                  }
                }
              </li>
            }
          </ol>
        }
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 8px;
    }
    p,
    ul,
    ol {
      margin: 0;
    }
    p {
      white-space: pre-line;
    }
    ul,
    ol {
      display: grid;
      gap: 4px;
      padding-left: 1.25em;
    }
    strong {
      font-weight: 650;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichText {
  readonly text = input('');
  protected readonly blocks = computed(() => blocksOf(this.text()));
}

import { Block, Inline, parseMarkdown } from '../../domain/markdown';

/**
 * El aviso de privacidad tal como lo dibuja la página: el titular y la línea de
 * versión y vigencia van aparte (a la izquierda), y el resto es el texto.
 */
export interface PrivacyDocument {
  readonly title: Inline[];
  readonly summary: Inline[];
  readonly blocks: Block[];
}

/**
 * Lee `docs/privacidad.md`. El documento tiene que abrir con un titular de nivel 1
 * y, justo después, el párrafo con la versión y la vigencia; si cambia esa forma, la
 * página no sabría dónde poner cada cosa: la prueba de este archivo lee el documento real, y el
 * CI la corre en cada PR que lo toca, para que no se note recién en producción.
 */
export function readPrivacyDocument(markdown: string): PrivacyDocument {
  const [title, summary, ...blocks] = parseMarkdown(markdown);
  if (title?.type !== 'heading' || title.level !== 1 || summary?.type !== 'paragraph') {
    throw new Error(
      'docs/privacidad.md debe abrir con un titular de nivel 1 y, después, el párrafo con la versión y la vigencia.',
    );
  }
  return { title: title.inlines, summary: summary.inlines, blocks };
}

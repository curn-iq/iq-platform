import { parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('lee los titulares con su nivel', () => {
    expect(parseMarkdown('# Uno\n\n## Dos\n')).toEqual([
      { type: 'heading', level: 1, inlines: [{ type: 'text', text: 'Uno' }] },
      { type: 'heading', level: 2, inlines: [{ type: 'text', text: 'Dos' }] },
    ]);
  });

  it('junta las líneas de un párrafo con un espacio', () => {
    expect(parseMarkdown('Primera línea\nsegunda línea\n\nOtro párrafo')).toEqual([
      { type: 'paragraph', inlines: [{ type: 'text', text: 'Primera línea segunda línea' }] },
      { type: 'paragraph', inlines: [{ type: 'text', text: 'Otro párrafo' }] },
    ]);
  });

  it('lee negrita y cursiva dentro del texto', () => {
    const [block] = parseMarkdown('Una **negrita**, una *cursiva* y texto.');

    expect(block).toEqual({
      type: 'paragraph',
      inlines: [
        { type: 'text', text: 'Una ' },
        { type: 'strong', text: 'negrita' },
        { type: 'text', text: ', una ' },
        { type: 'em', text: 'cursiva' },
        { type: 'text', text: ' y texto.' },
      ],
    });
  });

  it('lee un enlace https y deja como texto el que no lo es', () => {
    const [block] = parseMarkdown('[web](https://curn.edu.co) y [raro](javascript:void)');

    expect(block).toEqual({
      type: 'paragraph',
      inlines: [
        { type: 'link', text: 'web', href: 'https://curn.edu.co' },
        { type: 'text', text: ' y raro' },
      ],
    });
  });

  it('lee una lista con viñetas, con la continuación de un elemento en la línea de abajo', () => {
    expect(parseMarkdown('- **Uno**, primero\n- Dos\n  sigue aquí\n')).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [
          [
            { type: 'strong', text: 'Uno' },
            { type: 'text', text: ', primero' },
          ],
          [{ type: 'text', text: 'Dos sigue aquí' }],
        ],
      },
    ]);
  });

  it('lee una lista numerada', () => {
    expect(parseMarkdown('1. Conocer\n2. Rectificar')).toEqual([
      {
        type: 'list',
        ordered: true,
        items: [[{ type: 'text', text: 'Conocer' }], [{ type: 'text', text: 'Rectificar' }]],
      },
    ]);
  });

  it('lee una tabla con su encabezado y sus filas, sin la línea de guiones', () => {
    const markdown =
      '| Dato | Para qué |\n|---|---|\n| **Nombre** | Ingresar |\n| Rol | Permisos |';

    expect(parseMarkdown(markdown)).toEqual([
      {
        type: 'table',
        header: [[{ type: 'text', text: 'Dato' }], [{ type: 'text', text: 'Para qué' }]],
        rows: [
          [[{ type: 'strong', text: 'Nombre' }], [{ type: 'text', text: 'Ingresar' }]],
          [[{ type: 'text', text: 'Rol' }], [{ type: 'text', text: 'Permisos' }]],
        ],
      },
    ]);
  });

  it('no confunde un asterisco suelto con cursiva', () => {
    expect(parseMarkdown('2 * 3 y 4 * 5')).toEqual([
      { type: 'paragraph', inlines: [{ type: 'text', text: '2 * 3 y 4 * 5' }] },
    ]);
  });

  it('un texto vacío no tiene bloques', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('\n\n  \n')).toEqual([]);
  });

  it('acepta los saltos de línea de Windows', () => {
    expect(parseMarkdown('# Uno\r\n\r\nTexto\r\nseguido')).toEqual([
      { type: 'heading', level: 1, inlines: [{ type: 'text', text: 'Uno' }] },
      { type: 'paragraph', inlines: [{ type: 'text', text: 'Texto seguido' }] },
    ]);
  });
});

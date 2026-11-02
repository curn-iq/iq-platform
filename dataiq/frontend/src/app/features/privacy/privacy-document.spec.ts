import { readPrivacyDocument } from './privacy-document';
import privacyText from '../../../../../../docs/privacidad.md';

describe('readPrivacyDocument', () => {
  it('separa el titular y la línea de versión del resto del aviso', () => {
    const document = readPrivacyDocument(
      '# Aviso\n\n**IQ Platform** · Versión 9.9\n\n## Uno\n\nTexto',
    );

    expect(document.title).toEqual([{ type: 'text', text: 'Aviso' }]);
    expect(document.summary).toEqual([
      { type: 'strong', text: 'IQ Platform' },
      { type: 'text', text: ' · Versión 9.9' },
    ]);
    expect(document.blocks.map((block) => block.type)).toEqual(['heading', 'paragraph']);
  });

  it.each([
    ['sin titular', 'Texto suelto\n\n## Uno'],
    ['con el titular de otro nivel', '## Aviso\n\nVersión 1.0'],
    ['sin la línea de versión', '# Aviso\n\n## Uno'],
  ])('rechaza un documento %s', (_name, markdown) => {
    expect(() => readPrivacyDocument(markdown)).toThrow(/docs\/privacidad\.md/);
  });

  describe('docs/privacidad.md', () => {
    const document = readPrivacyDocument(privacyText);
    const headings = document.blocks.flatMap((block) =>
      block.type === 'heading' ? [block.inlines.map((inline) => inline.text).join('')] : [],
    );

    it('abre con el titular y la versión del aviso', () => {
      expect(document.title.map((inline) => inline.text).join('')).toBe(
        'Aviso de privacidad y autorización para el tratamiento de datos personales',
      );
      expect(document.summary.map((inline) => inline.text).join('')).toMatch(/Versión \d+\.\d+/);
    });

    it('trae las secciones que exige la autorización del Decreto 1377', () => {
      expect(headings).toEqual(
        expect.arrayContaining([
          'Responsable del tratamiento',
          'Qué datos se tratan, para qué y por cuánto tiempo',
          'Derechos del titular',
          'Autorización',
        ]),
      );
    });

    it('la tabla de datos tiene tres columnas en todas sus filas', () => {
      const table = document.blocks.find((block) => block.type === 'table');

      expect(table?.type === 'table' && table.header).toHaveLength(3);
      expect(table?.type === 'table' && table.rows.length).toBeGreaterThan(0);
      expect(table?.type === 'table' && table.rows.every((row) => row.length === 3)).toBe(true);
    });

    it('no deja marcas de Markdown sin leer', () => {
      const text = JSON.stringify(document);

      expect(text).not.toMatch(/\*\*|\]\(|\| ?---/);
    });
  });
});

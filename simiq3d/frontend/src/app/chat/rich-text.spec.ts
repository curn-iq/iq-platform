import { TestBed } from '@angular/core/testing';
import { blocksOf, plainText, RichText, spansOf } from './rich-text';

describe('RichText', () => {
  it('lee la negrita y deja un ** sin cerrar como está', () => {
    expect(spansOf('La **Pinza Kelly** es hemostática')).toEqual([
      { text: 'La ', bold: false },
      { text: 'Pinza Kelly', bold: true },
      { text: ' es hemostática', bold: false },
    ]);
    expect(spansOf('3 ** 2')).toEqual([{ text: '3 ** 2', bold: false }]);
  });

  it('separa párrafos y listas, y una línea en blanco corta la lista', () => {
    const blocks = blocksOf(
      'Va así:\n- **Arriba**: 5\n- Abajo: 1\n\n8. Pinza de Moynihan\n9. Pinza Rochester\nFin.',
    );

    expect(blocks.map((b) => b.kind)).toEqual(['p', 'ul', 'ol', 'p']);
    expect(blocks[1]).toEqual({
      kind: 'ul',
      items: [
        [
          { text: 'Arriba', bold: true },
          { text: ': 5', bold: false },
        ],
        [{ text: 'Abajo: 1', bold: false }],
      ],
    });
    expect(blocks[2]).toEqual({
      kind: 'ol',
      items: [
        { number: 8, spans: [{ text: 'Pinza de Moynihan', bold: false }] },
        { number: 9, spans: [{ text: 'Pinza Rochester', bold: false }] },
      ],
    });
  });

  it('quita las marcas para la línea de la última respuesta', () => {
    expect(plainText('La **Kelly**:\n- arriba\n- abajo')).toBe('La Kelly: arriba abajo');
  });

  it('cada elemento de una lista numerada muestra su número, aunque no vaya seguido', async () => {
    const fixture = TestBed.createComponent(RichText);
    fixture.componentRef.setInput('text', '4. Tijera de Mayo\n10. Pinza Kelly');
    await fixture.whenStable();

    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('li');
    expect(Array.from(items).map((li) => li.value)).toEqual([4, 10]);
  });

  it('nunca interpreta el texto como HTML', () => {
    const fixture = TestBed.createComponent(RichText);
    fixture.componentRef.setInput('text', '<img src=x onerror=alert(1)> y **<b>negrita</b>**');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('b')).toBeNull();
    expect(host.querySelector('strong')?.textContent).toBe('<b>negrita</b>');
  });
});

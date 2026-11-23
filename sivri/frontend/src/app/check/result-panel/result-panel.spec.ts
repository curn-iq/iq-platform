import { TestBed } from '@angular/core/testing';
import { readFrame, type FrameReading } from '../../domain/frame-reading';
import { frame, object, technique } from '../../domain/testing';
import { referenceTableUrl } from '../../links';
import { ResultPanel } from './result-panel';

const placed = (label: string, n: number) => object('in_place', label, n);

const mastectomy = technique('t-1', 'Mastectomía', [
  placed('Pinza de Allis', 1),
  placed('Pinza Rochester', 2),
  placed('Disección con garra', 3),
  object('doubtful', 'Disección sin garra', 4),
  placed('Separador de Farabeuf', 5),
  object('move', 'Pinza Kelly', 6, {
    message: 'Pinza Kelly (n.º 6): va en el centro, a la derecha, junto a Pinza Rochester (n.º 2).',
  }),
  placed('Tijera de Mayo', 7),
  placed('Tijera de Metzenbaum', 8),
  placed('Mango de bisturí N.º 3', 9),
  object('missing', 'Mango de bisturí N.º 4', 10, {
    message: 'Falta Mango de bisturí N.º 4 (n.º 10): va al final de la mesa.',
  }),
]);
const thyroid = technique('t-2', 'Tiroidectomía', [placed('A', 1), object('move', 'B', 2)]);

function render(reading: FrameReading) {
  const fixture = TestBed.createComponent(ResultPanel);
  fixture.componentRef.setInput('reading', reading);
  const opened: number[] = [];
  let again = 0;
  fixture.componentInstance.openPiece.subscribe((i) => opened.push(i));
  fixture.componentInstance.again.subscribe(() => again++);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return { root, opened, again: () => again };
}

const read = (...techniques: (typeof mastectomy)[]) => readFrame(frame({ techniques }));
const text = (root: HTMLElement, selector: string) =>
  Array.from(root.querySelectorAll(selector)).map((e) =>
    e.textContent?.replace(/\s+/g, ' ').trim(),
  );

describe('ResultPanel', () => {
  describe('con una técnica', () => {
    it('dice cuál técnica es y cuántas piezas están en su lugar', () => {
      const { root } = render(read(mastectomy));
      expect(root.querySelector('.eyebrow')?.textContent).toBe(
        'Mastectomía · la técnica la reconoció la cámara',
      );
      expect(root.querySelector('h1')?.textContent).toBe('8 de 10 en su lugar.');
      expect(root.querySelector('.lead')?.textContent).toBe(
        'Una pieza va en otro sitio y a la mesa le falta otra. Lo demás está como lo publicó el programa de IQ.',
      );
    });

    it('arma los grupos por mover, falta y en su lugar, con su cuenta', () => {
      const { root } = render(read(mastectomy));
      expect(text(root, '.name')).toEqual(['Por mover', 'Falta', 'En su lugar']);
      expect(text(root, '.note')).toEqual(['1 pieza', '1 pieza', '8 piezas']);
    });

    it('cada pieza lleva su número, su nombre y dónde va, sin repetir el nombre', () => {
      const { root } = render(read(mastectomy));
      const kelly = root.querySelector('.piece')!;
      expect(kelly.querySelector('.num')?.textContent).toBe('6');
      expect(kelly.querySelector('strong')?.textContent).toBe('Pinza Kelly');
      expect(kelly.querySelector('.sentence')?.textContent).toBe(
        'Va en el centro, a la derecha, junto a Pinza Rochester (n.º 2).',
      );
    });

    it('lista las que están en su lugar, también las dudosas, sin marcarlas', () => {
      const { root } = render(read(mastectomy));
      expect(root.querySelector('.placed')?.textContent).toBe(
        'Pinza de Allis, Pinza Rochester, Disección con garra, Disección sin garra, Separador de Farabeuf, Tijera de Mayo, Tijera de Metzenbaum y Mango de bisturí N.º 3.',
      );
    });

    it('«Ver dónde va» abre la pieza por su lugar en el recorrido: por mover y luego falta', () => {
      const { root, opened } = render(read(mastectomy));
      const links = Array.from(root.querySelectorAll<HTMLButtonElement>('.piece button'));
      expect(links.map((l) => l.textContent?.trim())).toEqual(['Ver dónde va', 'Ver dónde va']);
      links[0].click();
      links[1].click();
      expect(opened).toEqual([0, 1]);
    });

    it('«Revisar de nuevo» y la mesa de referencia de DataIQ', () => {
      const { root, again } = render(read(mastectomy));
      root.querySelector<HTMLButtonElement>('button[appButton]')!.click();
      expect(again()).toBe(1);
      const reference = Array.from(root.querySelectorAll('a')).find((a) =>
        a.textContent?.includes('Ver la mesa de referencia'),
      );
      expect(reference?.getAttribute('href')).toBe(referenceTableUrl('t-1'));
    });

    it('sin nada en su lugar no muestra ese grupo; sin nada que corregir, tampoco los otros', () => {
      const perfect = render(read(technique('t-1', 'X', [placed('A', 1), placed('B', 2)])));
      expect(text(perfect.root, '.name')).toEqual(['En su lugar']);
      expect(perfect.root.querySelector('.lead')?.textContent).toBe(
        'La mesa está como la publicó el programa de IQ.',
      );
      const none = render(read(technique('t-1', 'X', [object('missing', 'A', 1)])));
      expect(text(none.root, '.name')).toEqual(['Falta']);
    });

    it('lo que sobra va en su grupo, después de lo que falta', () => {
      const { root } = render(
        read(
          technique('t-1', 'X', [
            placed('A', 1),
            object('missing', 'B', 2),
            object('extra', 'Separador', null, { message: 'Sobra Separador: no va en esta mesa.' }),
          ]),
        ),
      );
      expect(text(root, '.name')).toEqual(['Falta', 'Sobra', 'En su lugar']);
      const extra = root.querySelectorAll('.piece')[1];
      expect(extra.querySelector('.sentence')?.textContent).toBe('No va en esta mesa.');
      expect(extra.querySelector('.num')).toBeNull();
    });
  });

  describe('con dos técnicas muy cerca', () => {
    it('no elige: dice «Puede ser una de dos.» y muestra las dos con su porcentaje', () => {
      const { root } = render(read(mastectomy, thyroid));
      expect(root.querySelector('h1')?.textContent).toBe('Puede ser una de dos.');
      expect(text(root, '.candidate .name')).toEqual(['Mastectomía', 'Tiroidectomía']);
      expect(text(root, '.candidate .detail')).toEqual([
        '80 % · 8 de 10 en su lugar',
        '50 % · 1 de 2 en su lugar',
      ]);
    });

    it('«Ver dónde va» queda desactivado hasta que una gane', () => {
      const { root, opened } = render(read(mastectomy, thyroid));
      const links = Array.from(root.querySelectorAll<HTMLButtonElement>('.piece button'));
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.disabled).toBe(true);
        expect(link.getAttribute('aria-disabled')).toBe('true');
        link.click();
      }
      expect(opened).toEqual([]);
    });

    it('«Revisar de nuevo» sigue activo', () => {
      const { root, again } = render(read(mastectomy, thyroid));
      root.querySelector<HTMLButtonElement>('button[appButton]')!.click();
      expect(again()).toBe(1);
    });
  });
});

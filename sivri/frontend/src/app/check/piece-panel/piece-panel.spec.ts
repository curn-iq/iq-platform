import { TestBed } from '@angular/core/testing';
import { readTechnique, type Piece } from '../../domain/frame-reading';
import { object, technique } from '../../domain/testing';
import { PiecePanel } from './piece-panel';

const reading = readTechnique(
  technique('t-1', 'Mastectomía', [
    object('move', 'Pinza Kelly', 6, {
      message:
        'Pinza Kelly (n.º 6): va en el centro, a la derecha, junto a Pinza Rochester (n.º 2).',
      move: { rows: 0, columns: 1 },
    }),
    object('missing', 'Mango de bisturí N.º 4', 10, {
      message: 'Falta Mango de bisturí N.º 4 (n.º 10): va al final de la mesa.',
    }),
    object('extra', 'Separador', null, { message: 'Sobra Separador: no va en esta mesa.' }),
  ]),
);
const [kelly] = reading.move;
const [handle] = reading.missing;
const [spare] = reading.extra;

function render(piece: Piece, index: number, next: Piece | null) {
  const fixture = TestBed.createComponent(PiecePanel);
  fixture.componentRef.setInput('piece', piece);
  fixture.componentRef.setInput('index', index);
  fixture.componentRef.setInput('total', 3);
  fixture.componentRef.setInput('next', next);
  let back = 0;
  let advance = 0;
  fixture.componentInstance.back.subscribe(() => back++);
  fixture.componentInstance.advance.subscribe(() => advance++);
  fixture.detectChanges();
  return { root: fixture.nativeElement as HTMLElement, back: () => back, advance: () => advance };
}

describe('PiecePanel', () => {
  it('muestra el nombre grande, su número y dónde va, como en el mockup', () => {
    const { root } = render(kelly, 0, handle);
    expect(root.querySelector('.eyebrow')?.textContent).toBe('Por mover · 1 de 3');
    expect(root.querySelector('h1')?.textContent).toBe('Pinza Kelly');
    expect(root.querySelector('.legend')?.textContent).toBe('n.º 6 en el diagrama de la técnica');
    expect(root.querySelector('.instruction')?.textContent).toBe(
      'Va en el centro, a la derecha, junto a Pinza Rochester (n.º 2). Muévela en la dirección de la flecha.',
    );
  });

  it('«Resultado» vuelve y «Siguiente» dice cuál sigue', () => {
    const { root, back, advance } = render(kelly, 0, handle);
    const buttons = root.querySelectorAll<HTMLButtonElement>('nav button');
    expect(buttons[0].textContent?.trim()).toBe('‹ Resultado');
    expect(buttons[1].textContent?.trim()).toBe('Siguiente: Mango de bisturí N.º 4');
    buttons[0].click();
    buttons[1].click();
    expect(back()).toBe(1);
    expect(advance()).toBe(1);
  });

  it('«Resultado» no lleva flecha; «Siguiente» sí', () => {
    const { root } = render(kelly, 0, handle);
    const buttons = root.querySelectorAll('nav button');
    expect(buttons[0].querySelector('svg')).toBeNull();
    expect(buttons[1].querySelector('svg')).not.toBeNull();
  });

  it('en la última pieza no hay «Siguiente»', () => {
    const { root } = render(spare, 2, null);
    expect(root.querySelectorAll('nav button')).toHaveLength(1);
  });

  it('una pieza que falta dice dónde va, sin flecha', () => {
    const { root } = render(handle, 1, spare);
    expect(root.querySelector('.eyebrow')?.textContent).toBe('Falta · 2 de 3');
    expect(root.querySelector('.instruction')?.textContent).toBe('Va al final de la mesa.');
  });

  it('una pieza que sobra, sin número de diagrama, no lo inventa', () => {
    const { root } = render(spare, 2, null);
    expect(root.querySelector('.eyebrow')?.textContent).toBe('Sobra · 3 de 3');
    expect(root.querySelector('.legend')).toBeNull();
    expect(root.querySelector('.instruction')?.textContent).toBe(
      'No va en esta mesa. Retírala de la mesa.',
    );
  });
});

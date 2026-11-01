import { TestBed } from '@angular/core/testing';
import type { Table, TableItem } from '../../../domain/table';
import { TechniqueTable } from './technique-table';

function item(overrides: Partial<TableItem> = {}): TableItem {
  return {
    id: 'i-1',
    legendNumber: 1,
    name: 'Pinza Kelly',
    components: ['Pinza Kelly'],
    instruments: ['Pinza Kelly'],
    cells: [{ row: 1, column: 1 }],
    ...overrides,
  };
}

function makeTable(overrides: Partial<Table> = {}): Table {
  return {
    zoneId: 'z-mayo',
    name: 'Mesa de Mayo',
    rows: 4,
    columns: 6,
    items: [
      item({ id: 'a', legendNumber: 1, name: 'Pinza Kelly', cells: [{ row: 1, column: 1 }] }),
      item({ id: 'b', legendNumber: 2, name: 'Tijera de Mayo', cells: [{ row: 1, column: 2 }] }),
    ],
    ...overrides,
  };
}

describe('TechniqueTable', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TechniqueTable>>;
  let root: HTMLElement;

  async function mount(table: Table | null = makeTable()) {
    fixture = TestBed.createComponent(TechniqueTable);
    fixture.componentRef.setInput('title', 'Mesa de Mayo');
    fixture.componentRef.setInput('hint', 'Señala un número para ubicar su pieza.');
    fixture.componentRef.setInput('empty', 'Sin mesa de Mayo.');
    fixture.componentRef.setInput('table', table ?? undefined);
    root = fixture.nativeElement;
    await fixture.whenStable();
  }

  const piece = (n: number) => root.querySelector<SVGGElement>(`.piece[data-n="${n}"]`)!;
  const row = (n: number) =>
    Array.from(root.querySelectorAll<HTMLElement>('app-table-legend li[data-kind=placed]')).find(
      (li) => li.querySelector('b')!.textContent === String(n),
    )!;
  const pieceActive = (n: number) => piece(n).classList.contains('active');
  const rowActive = (n: number) => row(n).classList.contains('active');
  const settle = () => fixture.whenStable();
  const mouse = (target: Element, type: 'mouseenter' | 'mouseleave') =>
    target.dispatchEvent(new MouseEvent(type));
  const focus = (target: Element, type: 'focus' | 'blur') =>
    target.dispatchEvent(new FocusEvent(type));

  it('lleva el título, la indicación, la leyenda y la mesa', async () => {
    await mount();

    expect(root.querySelector('h2')!.textContent).toBe('Mesa de Mayo');
    expect(root.querySelector('.info p')!.textContent).toBe(
      'Señala un número para ubicar su pieza.',
    );
    expect(root.querySelectorAll('app-table-legend li')).toHaveLength(2);
    expect(root.querySelector('app-table-diagram svg')!.getAttribute('aria-label')).toBe(
      'Mesa de Mayo',
    );
  });

  it('si la técnica no lleva la mesa, lo dice en un recuadro y no dibuja nada', async () => {
    await mount(null);

    expect(root.querySelector('.none')!.textContent).toBe('Sin mesa de Mayo.');
    expect(root.querySelector('app-table-diagram')).toBeNull();
    expect(root.querySelector('app-table-legend')).toBeNull();
    expect(root.querySelector('h2')).toBeNull();
  });

  it('toma la proporción de su cuadrícula', async () => {
    await mount(makeTable({ rows: 4, columns: 6 }));

    expect(root.style.getPropertyValue('--aspect')).toBe('1.5');
  });

  describe('foco compartido entre la mesa y su leyenda', () => {
    it('señalar una pieza marca su fila, y señalar una fila levanta su pieza', async () => {
      await mount();

      mouse(piece(1), 'mouseenter');
      await settle();
      expect([pieceActive(1), rowActive(1)]).toEqual([true, true]);
      mouse(piece(1), 'mouseleave');
      await settle();

      mouse(row(2), 'mouseenter');
      await settle();
      expect([pieceActive(2), rowActive(2)]).toEqual([true, true]);
      expect([pieceActive(1), rowActive(1)]).toEqual([false, false]);
    });

    it('una pieza con el foco sigue señalada si el puntero pasa por la leyenda y se va', async () => {
      await mount();

      focus(piece(1), 'focus');
      mouse(row(2), 'mouseenter');
      await settle();
      expect([pieceActive(2), rowActive(2)]).toEqual([true, true]);

      mouse(row(2), 'mouseleave');
      await settle();

      expect([pieceActive(1), rowActive(1)]).toEqual([true, true]);
      expect([pieceActive(2), rowActive(2)]).toEqual([false, false]);
    });

    it('una fila con el foco sigue señalada si el puntero pasa por la mesa y se va', async () => {
      await mount();

      focus(row(1), 'focus');
      mouse(piece(2), 'mouseenter');
      await settle();
      expect([pieceActive(2), rowActive(2)]).toEqual([true, true]);

      mouse(piece(2), 'mouseleave');
      await settle();

      expect([pieceActive(1), rowActive(1)]).toEqual([true, true]);
      expect([pieceActive(2), rowActive(2)]).toEqual([false, false]);
    });

    it('al perder el foco se suelta, y el puntero ya no vuelve a lo que lo tenía', async () => {
      await mount();

      focus(piece(1), 'focus');
      focus(piece(1), 'blur');
      await settle();
      expect([pieceActive(1), rowActive(1)]).toEqual([false, false]);

      mouse(row(2), 'mouseenter');
      mouse(row(2), 'mouseleave');
      await settle();

      expect(root.querySelector('.piece.active')).toBeNull();
      expect(root.querySelector('li.active')).toBeNull();
    });

    it('al pasar el foco de la mesa a la leyenda, manda el nuevo', async () => {
      await mount();

      focus(piece(1), 'focus');
      focus(piece(1), 'blur');
      focus(row(2), 'focus');
      await settle();
      expect([pieceActive(2), rowActive(2)]).toEqual([true, true]);

      mouse(piece(1), 'mouseenter');
      mouse(piece(1), 'mouseleave');
      await settle();

      expect([pieceActive(2), rowActive(2)]).toEqual([true, true]);
    });

    it('al cambiar de mesa se borra lo señalado', async () => {
      await mount();
      focus(piece(1), 'focus');
      await settle();
      expect(pieceActive(1)).toBe(true);

      fixture.componentRef.setInput(
        'table',
        makeTable({ items: [item({ id: 'z', legendNumber: 1, name: 'Bisturí' })] }),
      );
      await settle();

      expect(root.querySelector('.piece.active')).toBeNull();
      expect(root.querySelector('li.active')).toBeNull();
    });
  });
});

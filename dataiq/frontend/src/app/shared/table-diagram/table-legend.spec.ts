import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Table, TableItem } from '../../domain/table';
import { TableLegend } from './table-legend';

@Component({
  imports: [TableLegend],
  template: '<app-table-legend [table]="table" [(highlighted)]="highlighted" />',
})
class Host {
  table: Table = makeTable();
  highlighted: number | null = null;
}

function makeItem(overrides: Partial<TableItem> = {}): TableItem {
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

function makeTable(items: TableItem[] = []): Table {
  return { zoneId: 'z', name: 'Mesa de Mayo', rows: 7, columns: 5, items };
}

describe('TableLegend', () => {
  async function mount(items: TableItem[], highlighted: number | null = null) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.table = makeTable(items);
    fixture.componentInstance.highlighted = highlighted;
    await fixture.whenStable();
    return fixture;
  }

  const rows = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('li')];

  it('lista cada objeto con su número y su nombre, por número', async () => {
    const fixture = await mount([
      makeItem({ id: 'b', legendNumber: 2, name: 'Tijera de Mayo' }),
      makeItem({ id: 'a', legendNumber: 1, name: 'Pinza de Allis' }),
    ]);
    const text = rows(fixture.nativeElement).map((li) => [
      li.querySelector('b')?.textContent,
      li.querySelector('span')?.textContent,
    ]);
    expect(text).toEqual([
      ['1', 'Pinza de Allis'],
      ['2', 'Tijera de Mayo'],
    ]);
  });

  it('no lista el objeto sin número', async () => {
    const fixture = await mount([
      makeItem({ id: 'a', legendNumber: 1 }),
      makeItem({ id: 'b', legendNumber: null }),
    ]);
    expect(rows(fixture.nativeElement)).toHaveLength(1);
  });

  describe('lo que no está en la mesa', () => {
    const gap = makeItem({ id: 'g', legendNumber: 8, cells: [], components: [], name: 'Mb 4' });
    const unplaced = makeItem({ id: 'u', legendNumber: 9, cells: [], name: 'Pinza Kelly' });

    it('un número que la fuente no deja leer es un hueco «Sin dato», sin el texto crudo', async () => {
      const fixture = await mount([gap]);
      const [row] = rows(fixture.nativeElement);
      expect(row.querySelector('b')?.textContent).toBe('8');
      expect(row.querySelector('span')?.textContent).toBe('Sin dato');
      expect(row.getAttribute('data-kind')).toBe('gap');
      expect(row.textContent).not.toContain('Mb 4');
    });

    it('un objeto con nombre y sin celdas se lista con su nombre, apagado', async () => {
      const fixture = await mount([unplaced]);
      const [row] = rows(fixture.nativeElement);
      expect(row.querySelector('span')?.textContent).toBe('Pinza Kelly');
      expect(row.getAttribute('data-kind')).toBe('unplaced');
    });

    it('conserva su lugar por número entre los demás', async () => {
      const fixture = await mount([unplaced, makeItem({ id: 'a', legendNumber: 1 }), gap]);
      const numbers = rows(fixture.nativeElement).map((li) => li.querySelector('b')?.textContent);
      expect(numbers).toEqual(['1', '8', '9']);
    });

    it('no se llega con el teclado ni se señala: no hay pieza que levantar', async () => {
      const fixture = await mount([gap, unplaced]);
      for (const row of rows(fixture.nativeElement)) {
        expect(row.hasAttribute('tabindex')).toBe(false);
        row.dispatchEvent(new MouseEvent('mouseenter'));
        row.dispatchEvent(new FocusEvent('focus'));
      }
      await fixture.whenStable();
      expect(fixture.componentInstance.highlighted).toBeNull();
    });

    it('nunca queda marcado, aunque su número sea el señalado', async () => {
      const fixture = await mount([gap], 8);
      expect(rows(fixture.nativeElement)[0].classList.contains('active')).toBe(false);
    });
  });

  it('la fila señalada queda marcada', async () => {
    const fixture = await mount(
      [makeItem({ id: 'a', legendNumber: 1 }), makeItem({ id: 'b', legendNumber: 2 })],
      2,
    );
    expect(rows(fixture.nativeElement).map((li) => li.classList.contains('active'))).toEqual([
      false,
      true,
    ]);
  });

  it('pasar el puntero por una fila la señala, y al salir se suelta', async () => {
    const fixture = await mount([makeItem({ legendNumber: 4 })]);
    const row = rows(fixture.nativeElement)[0];
    row.dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();
    expect(fixture.componentInstance.highlighted).toBe(4);
    row.dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();
    expect(fixture.componentInstance.highlighted).toBeNull();
  });

  it('enfocar una fila con el teclado la señala, y al salir se suelta', async () => {
    const fixture = await mount([makeItem({ legendNumber: 4 })]);
    const row = rows(fixture.nativeElement)[0];
    expect(row.getAttribute('tabindex')).toBe('0');
    row.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(fixture.componentInstance.highlighted).toBe(4);
    row.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.highlighted).toBeNull();
  });

  it('si el puntero pasa por la fila enfocada y se va, la fila sigue señalada', async () => {
    const fixture = await mount([makeItem({ legendNumber: 4 })]);
    const row = rows(fixture.nativeElement)[0];
    row.dispatchEvent(new FocusEvent('focus'));
    row.dispatchEvent(new MouseEvent('mouseenter'));
    row.dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();
    expect(fixture.componentInstance.highlighted).toBe(4);
  });

  it('es una lista con el nombre de su mesa', async () => {
    const fixture = await mount([makeItem()]);
    const list = (fixture.nativeElement as HTMLElement).querySelector('ol');
    expect(list?.getAttribute('aria-label')).toBe('Leyenda de Mesa de Mayo');
  });
});

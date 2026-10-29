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

  it('no lista lo que no se puede señalar en la mesa: sin número o sin celda', async () => {
    const fixture = await mount([
      makeItem({ id: 'a', legendNumber: 1 }),
      makeItem({ id: 'b', legendNumber: null }),
      makeItem({ id: 'c', legendNumber: 3, cells: [] }),
    ]);
    expect(rows(fixture.nativeElement)).toHaveLength(1);
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

  it('es una lista con el nombre de su mesa', async () => {
    const fixture = await mount([makeItem()]);
    const list = (fixture.nativeElement as HTMLElement).querySelector('ol');
    expect(list?.getAttribute('aria-label')).toBe('Leyenda de Mesa de Mayo');
  });
});

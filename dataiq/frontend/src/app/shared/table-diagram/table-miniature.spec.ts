import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Table, TableItem } from '../../domain/table';
import { TableMiniature } from './table-miniature';

@Component({
  imports: [TableMiniature],
  template: '<app-table-miniature [table]="table" [item]="item" [index]="index" />',
})
class Host {
  table: Table = makeTable();
  item: TableItem = makeItem();
  index = 0;
}

function makeTable(overrides: Partial<Table> = {}): Table {
  return { zoneId: 'z', name: 'Mesa de Mayo', rows: 7, columns: 5, items: [], ...overrides };
}

function makeItem(overrides: Partial<TableItem> = {}): TableItem {
  return {
    id: 'i-1',
    legendNumber: 4,
    name: 'Pinza Kelly',
    components: ['Pinza Kelly'],
    cells: [{ row: 2, column: 3 }],
    ...overrides,
  };
}

describe('TableMiniature', () => {
  async function render(
    options: { table?: Table; item?: TableItem; index?: number } = {},
  ): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    Object.assign(fixture.componentInstance, options);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const cells = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('.cell')];

  it('dibuja una celda por cada celda de la mesa', async () => {
    const root = await render();
    expect(cells(root)).toHaveLength(7 * 5);
  });

  it('las celdas van por filas, de arriba abajo y de izquierda a derecha', async () => {
    // celda (fila 2, columna 3) en una mesa de 5 columnas: el índice 1 × 5 + 2 = 7
    const root = await render();
    const on = cells(root).findIndex((cell) => cell.classList.contains('on'));
    expect(on).toBe(7);
  });

  it('enciende solo las celdas del objeto', async () => {
    const item = makeItem({
      cells: [
        { row: 4, column: 2 },
        { row: 5, column: 1 },
      ],
    });
    const root = await render({ item });
    expect(root.querySelectorAll('.cell.on')).toHaveLength(2);
  });

  it('el número va en la primera celda, en orden de lectura, y esa celda es un círculo', async () => {
    const item = makeItem({
      legendNumber: 2,
      cells: [
        { row: 5, column: 1 },
        { row: 4, column: 2 },
      ],
    });
    const root = await render({ item });
    const numbered = root.querySelectorAll('.cell.numbered');
    expect(numbered).toHaveLength(1);
    expect(numbered[0].textContent?.trim()).toBe('2');
    // (fila 4, columna 2): índice 3 × 5 + 1 = 16
    expect(cells(root).indexOf(numbered[0] as HTMLElement)).toBe(16);
  });

  it('un objeto sin número enciende sus celdas sin círculo', async () => {
    const root = await render({ item: makeItem({ legendNumber: null }) });
    expect(root.querySelectorAll('.cell.on')).toHaveLength(1);
    expect(root.querySelectorAll('.cell.numbered')).toHaveLength(0);
  });

  it('solo una celda lleva número, aunque el objeto ocupe varias', async () => {
    const item = makeItem({
      cells: [
        { row: 1, column: 1 },
        { row: 1, column: 2 },
        { row: 1, column: 3 },
      ],
    });
    const root = await render({ item });
    expect(root.querySelectorAll('.cell.on')).toHaveLength(3);
    expect(root.querySelectorAll('.cell .number')).toHaveLength(1);
  });

  it('cada celda encendida se enciende en el turno de su fila de la lista', async () => {
    const root = await render({ index: 3 });
    const on = root.querySelector<HTMLElement>('.cell.on');
    expect(on?.style.getPropertyValue('--k')).toBe('3');
  });

  it('el ancho sale de las columnas de la mesa', async () => {
    const root = await render({ table: makeTable({ columns: 12 }) });
    expect(root.querySelector<HTMLElement>('.grid')?.style.getPropertyValue('--columns')).toBe(
      '12',
    );
  });

  it('una mesa ancha se desplaza dentro de su marco', async () => {
    const root = await render({ table: makeTable({ columns: 14 }) });
    const frame = root.querySelector('.frame');
    expect(frame).toBeTruthy();
    expect(frame?.querySelector('.grid')).toBeTruthy();
  });

  it('es decorativa: el nombre de la técnica y de la mesa están en el texto de al lado', async () => {
    const root = await render();
    expect(root.querySelector('.grid')?.getAttribute('aria-hidden')).toBe('true');
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Table } from '../../domain/table';
import { TableDiagram } from './table-diagram';

@Component({
  imports: [TableDiagram],
  template: '<app-table-diagram [table]="table" />',
})
class Host {
  table: Table = { zoneId: 'z-mayo', name: 'Mesa de Mayo', rows: 7, columns: 5 };
}

describe('TableDiagram', () => {
  async function render(table?: Table): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    if (table) fixture.componentInstance.table = table;
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('dibuja un SVG del tamaño de la mesa: 100 unidades por celda', async () => {
    const svg = (await render()).querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 500 700');
  });

  it('traza una línea entre cada par de columnas y de filas, sin bordes de más', async () => {
    const root = await render();
    expect(root.querySelectorAll('.grid-line[data-axis="column"]').length).toBe(4);
    expect(root.querySelectorAll('.grid-line[data-axis="row"]').length).toBe(6);
  });

  it('una mesa de una sola celda no tiene líneas internas', async () => {
    const root = await render({ zoneId: 'z', name: 'Mesa de Mayo', rows: 1, columns: 1 });
    expect(root.querySelectorAll('.grid-line').length).toBe(0);
  });

  it('toma la proporción de su grilla', async () => {
    const root = await render({ zoneId: 'z', name: 'Mesa de reserva', rows: 6, columns: 8 });
    const diagram = root.querySelector<HTMLElement>('app-table-diagram');
    expect(diagram?.style.getPropertyValue('--aspect')).toBe('8 / 6');
  });

  it('se anuncia con el nombre de su mesa', async () => {
    const svg = (await render()).querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('group');
    expect(svg?.getAttribute('aria-label')).toBe('Mesa de Mayo');
  });
});

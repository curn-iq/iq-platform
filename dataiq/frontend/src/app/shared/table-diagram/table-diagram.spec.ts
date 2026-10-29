import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Table, TableItem } from '../../domain/table';
import { TableDiagram } from './table-diagram';

@Component({
  imports: [TableDiagram],
  template: '<app-table-diagram [table]="table" />',
})
class Host {
  table: Table = makeTable();
}

function makeTable(overrides: Partial<Table> = {}): Table {
  return { zoneId: 'z-mayo', name: 'Mesa de Mayo', rows: 7, columns: 5, items: [], ...overrides };
}

function makeItem(overrides: Partial<TableItem> = {}): TableItem {
  return { id: 'i-1', legendNumber: 1, cells: [{ row: 2, column: 3 }], ...overrides };
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
    const root = await render(makeTable({ rows: 1, columns: 1 }));
    expect(root.querySelectorAll('.grid-line').length).toBe(0);
  });

  it('toma la proporción de su grilla', async () => {
    const root = await render(makeTable({ name: 'Mesa de reserva', rows: 6, columns: 8 }));
    const diagram = root.querySelector<HTMLElement>('app-table-diagram');
    expect(diagram?.style.getPropertyValue('--aspect')).toBe('8 / 6');
  });

  it('se anuncia con el nombre de su mesa', async () => {
    const svg = (await render()).querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('group');
    expect(svg?.getAttribute('aria-label')).toBe('Mesa de Mayo');
  });

  describe('objetos', () => {
    it('un objeto de una celda es una pieza con su número', async () => {
      const root = await render(makeTable({ items: [makeItem({ legendNumber: 4 })] }));
      expect(root.querySelectorAll('.piece').length).toBe(1);
      expect(root.querySelector('.piece .number text')?.textContent).toBe('4');
    });

    it('un objeto en varias celdas es una sola pieza, con un solo número', async () => {
      const cells = [
        { row: 4, column: 2 },
        { row: 5, column: 1 },
      ];
      const root = await render(makeTable({ items: [makeItem({ legendNumber: 2, cells })] }));
      expect(root.querySelectorAll('.piece').length).toBe(1);
      expect(root.querySelectorAll('.number').length).toBe(1);
      expect(root.querySelectorAll('.piece .hit').length).toBe(2);
    });

    it('cada zona de clic cubre su celda entera', async () => {
      const root = await render(makeTable({ items: [makeItem()] }));
      const hit = root.querySelector('.piece .hit');
      // celda (fila 2, columna 3)
      expect(hit?.getAttribute('x')).toBe('200');
      expect(hit?.getAttribute('y')).toBe('100');
      expect(hit?.getAttribute('width')).toBe('100');
      expect(hit?.getAttribute('height')).toBe('100');
    });

    it('pone el número donde dice piece-layout', async () => {
      const root = await render(makeTable({ items: [makeItem()] }));
      const circle = root.querySelector('.number circle');
      expect(circle?.getAttribute('cx')).toBe('282');
      expect(circle?.getAttribute('cy')).toBe('182');
    });

    it('un objeto sin celda no se dibuja: la fuente no lo ubica', async () => {
      const root = await render(makeTable({ items: [makeItem({ cells: [] })] }));
      expect(root.querySelectorAll('.piece').length).toBe(0);
    });

    it('un objeto ubicado sin número se dibuja sin número', async () => {
      const root = await render(makeTable({ items: [makeItem({ legendNumber: null })] }));
      expect(root.querySelectorAll('.piece').length).toBe(1);
      expect(root.querySelectorAll('.number').length).toBe(0);
    });

    it('lleva el número en data-n para enlazarlo con la leyenda', async () => {
      const root = await render(makeTable({ items: [makeItem({ legendNumber: 7 })] }));
      expect(root.querySelector('.piece')?.getAttribute('data-n')).toBe('7');
    });

    it('dibuja cada objeto una vez', async () => {
      const items = [
        makeItem({ id: 'a', legendNumber: 1, cells: [{ row: 1, column: 1 }] }),
        makeItem({ id: 'b', legendNumber: 2, cells: [{ row: 1, column: 2 }] }),
      ];
      const root = await render(makeTable({ items }));
      const numbers = [...root.querySelectorAll('.number text')].map((text) => text.textContent);
      expect(numbers).toEqual(['1', '2']);
    });

    it('el número no escala hasta medir el dibujo', async () => {
      const root = await render(makeTable({ items: [makeItem()] }));
      const svg = root.querySelector<SVGElement>('svg');
      expect(svg?.style.getPropertyValue('--number-scale')).toBe('1');
    });

    describe('con el dibujo medido', () => {
      let disconnect: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        disconnect = vi.fn();
        // jsdom no trae ResizeObserver: este avisa una vez al empezar a observar
        vi.stubGlobal(
          'ResizeObserver',
          class {
            constructor(private readonly callback: () => void) {}
            observe(): void {
              this.callback();
            }
            disconnect = disconnect;
          },
        );
        vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
          width: 250,
        } as DOMRect);
      });

      afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
      });

      it('reescala el número según el ancho que ocupa el dibujo', async () => {
        const root = await render(makeTable({ columns: 5, items: [makeItem()] }));
        const svg = root.querySelector<SVGElement>('svg');
        // 250 px para 500 unidades: el dibujo se achica a la mitad y el número se agranda al doble
        expect(Number(svg?.style.getPropertyValue('--number-scale'))).toBeCloseTo(22 / 16);
      });

      it('deja de observar al destruirse', async () => {
        const fixture = TestBed.createComponent(Host);
        await fixture.whenStable();
        fixture.destroy();
        expect(disconnect).toHaveBeenCalled();
      });
    });
  });
});

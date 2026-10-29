import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Table, TableItem } from '../../domain/table';
import { TableDiagram } from './table-diagram';

@Component({
  imports: [TableDiagram],
  template:
    '<app-table-diagram [table]="table" [variant]="variant" [(highlighted)]="highlighted" />',
})
class Host {
  table: Table = makeTable();
  variant: 'full' | 'preview' = 'full';
  highlighted: number | null = null;
}

function makeTable(overrides: Partial<Table> = {}): Table {
  return { zoneId: 'z-mayo', name: 'Mesa de Mayo', rows: 7, columns: 5, items: [], ...overrides };
}

function makeItem(overrides: Partial<TableItem> = {}): TableItem {
  return {
    id: 'i-1',
    legendNumber: 1,
    name: 'Pinza Kelly',
    components: ['Pinza Kelly'],
    cells: [{ row: 2, column: 3 }],
    ...overrides,
  };
}

describe('TableDiagram', () => {
  async function mount(table?: Table, highlighted: number | null = null) {
    const fixture = TestBed.createComponent(Host);
    if (table) fixture.componentInstance.table = table;
    fixture.componentInstance.highlighted = highlighted;
    await fixture.whenStable();
    return fixture;
  }

  async function render(table?: Table): Promise<HTMLElement> {
    return (await mount(table)).nativeElement;
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

  describe('vista previa', () => {
    const items = [
      makeItem({ id: 'a', legendNumber: 1, cells: [{ row: 1, column: 1 }] }),
      makeItem({ id: 'b', legendNumber: 2, cells: [{ row: 5, column: 2 }] }),
    ];

    async function preview(table: Table): Promise<HTMLElement> {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.table = table;
      fixture.componentInstance.variant = 'preview';
      await fixture.whenStable();
      return fixture.nativeElement;
    }

    it('es la variante completa si no se pide otra', async () => {
      const root = await render(makeTable({ items }));
      expect(root.querySelector('app-table-diagram')?.getAttribute('data-variant')).toBe('full');
    });

    it('se marca como vista previa', async () => {
      const root = await preview(makeTable({ items }));
      expect(root.querySelector('app-table-diagram')?.getAttribute('data-variant')).toBe('preview');
    });

    it('sigue dibujando la grilla y el instrumental: el vistazo es real', async () => {
      const root = await preview(makeTable({ items }));
      expect(root.querySelectorAll('.grid-line').length).toBe(4 + 6);
      expect(root.querySelectorAll('.piece [data-drawing="kelly"]').length).toBe(2);
    });

    it('no lleva números', async () => {
      const root = await preview(makeTable({ items }));
      expect(root.querySelectorAll('.number').length).toBe(0);
    });

    it('no se señala ni se llega con el teclado, y no dice qué es cada pieza', async () => {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.table = makeTable({ items });
      fixture.componentInstance.variant = 'preview';
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      const piece = root.querySelector('.piece')!;
      expect(piece.hasAttribute('tabindex')).toBe(false);
      expect(piece.hasAttribute('role')).toBe(false);
      expect(piece.hasAttribute('aria-label')).toBe(false);
      expect(piece.hasAttribute('data-n')).toBe(false);
      piece.dispatchEvent(new MouseEvent('mouseenter'));
      await fixture.whenStable();
      expect(fixture.componentInstance.highlighted).toBeNull();
    });

    it('es decorativa para los lectores de pantalla: la tarjeta de la puerta dice lo que abre', async () => {
      const svg = (await preview(makeTable({ items }))).querySelector('svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(svg?.hasAttribute('role')).toBe(false);
      expect(svg?.hasAttribute('aria-label')).toBe(false);
    });

    it('una mesa alta se recorta a sus dos filas y media', async () => {
      const diagram = (
        await preview(makeTable({ rows: 7, columns: 5 }))
      ).querySelector<HTMLElement>('app-table-diagram')!;
      expect(diagram.getAttribute('data-cropped')).toBe('true');
      expect(diagram.style.getPropertyValue('--visible-rows')).toBe('2.5');
      expect(diagram.style.getPropertyValue('--columns')).toBe('5');
    });

    it('una mesa de dos filas o menos se ve entera, sin recorte', async () => {
      const diagram = (
        await preview(makeTable({ rows: 2, columns: 6 }))
      ).querySelector<HTMLElement>('app-table-diagram')!;
      expect(diagram.getAttribute('data-cropped')).toBe('false');
      expect(diagram.style.getPropertyValue('--visible-rows')).toBe('2');
    });

    it('una mesa vacía (sin objetos) también se dibuja: no revela si la técnica la tiene', async () => {
      const root = await preview(makeTable({ rows: 6, columns: 8, items: [] }));
      expect(root.querySelectorAll('.grid-line').length).toBe(7 + 5);
      expect(root.querySelectorAll('.piece').length).toBe(0);
    });
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

    describe('formas', () => {
      it('un instrumento con dibujo se pinta en acero', async () => {
        const root = await render(makeTable({ items: [makeItem()] }));
        const shape = root.querySelector('.piece .shape [data-drawing="kelly"]');
        expect(shape?.getAttribute('data-kind')).toBe('steel');
        expect(shape?.querySelectorAll('.steel').length).toBeGreaterThan(0);
      });

      it('lo que es de tela o bandeja se pinta plano', async () => {
        const item = makeItem({ name: 'Paquete de ropa', components: ['Paquete de ropa'] });
        const root = await render(makeTable({ items: [item] }));
        const shape = root.querySelector('.piece .shape [data-drawing="ropa"]');
        expect(shape?.getAttribute('data-kind')).toBe('flat');
        expect(shape?.querySelectorAll('.cloth').length).toBeGreaterThan(0);
      });

      it('lo que no tiene dibujo es un recuadro punteado, nunca el dibujo de otro', async () => {
        const item = makeItem({ name: 'Pinza de Babcock', components: ['Pinza de Babcock'] });
        const root = await render(makeTable({ items: [item] }));
        expect(root.querySelectorAll('.piece .unknown').length).toBe(1);
        expect(root.querySelectorAll('.piece [data-drawing]').length).toBe(0);
      });

      it('un objeto de varias celdas dibuja su forma una sola vez', async () => {
        const item = makeItem({
          cells: [
            { row: 4, column: 2 },
            { row: 5, column: 1 },
          ],
          components: ['Pinza de Campo'],
        });
        const root = await render(makeTable({ items: [item] }));
        expect(root.querySelectorAll('.piece [data-drawing="campo"]').length).toBe(1);
      });

      it('el degradado del acero es propio de cada diagrama', async () => {
        const first = await render();
        const second = await render();
        const idOf = (root: HTMLElement) => root.querySelector('linearGradient.steel-gradient')?.id;
        expect(idOf(first)).toBeTruthy();
        expect(idOf(first)).not.toBe(idOf(second));
      });
    });

    describe('enlace con la leyenda', () => {
      const items = [
        makeItem({ id: 'a', legendNumber: 1, cells: [{ row: 1, column: 1 }] }),
        makeItem({ id: 'b', legendNumber: 2, cells: [{ row: 1, column: 2 }] }),
      ];
      const piece = (root: HTMLElement, n: number) =>
        root.querySelector<SVGGElement>(`.piece[data-n="${n}"]`)!;

      it('señalar un número levanta su pieza y atenúa las demás', async () => {
        const fixture = await mount(makeTable({ items }), 2);
        const root: HTMLElement = fixture.nativeElement;
        expect(piece(root, 2).classList.contains('active')).toBe(true);
        expect(piece(root, 1).classList.contains('active')).toBe(false);
        expect(root.querySelector('svg')?.classList.contains('marking')).toBe(true);
      });

      it('sin nada señalado no se atenúa nada', async () => {
        const root = await render(makeTable({ items }));
        expect(root.querySelector('svg')?.classList.contains('marking')).toBe(false);
        expect(root.querySelectorAll('.piece.active').length).toBe(0);
      });

      it('pasar el puntero por una pieza la señala, y al salir se suelta', async () => {
        const fixture = await mount(makeTable({ items }));
        const root: HTMLElement = fixture.nativeElement;
        piece(root, 1).dispatchEvent(new MouseEvent('mouseenter'));
        await fixture.whenStable();
        expect(fixture.componentInstance.highlighted).toBe(1);
        piece(root, 1).dispatchEvent(new MouseEvent('mouseleave'));
        await fixture.whenStable();
        expect(fixture.componentInstance.highlighted).toBeNull();
      });

      it('enfocar una pieza con el teclado la señala, y al salir se suelta', async () => {
        const fixture = await mount(makeTable({ items }));
        const root: HTMLElement = fixture.nativeElement;
        piece(root, 2).dispatchEvent(new FocusEvent('focus'));
        await fixture.whenStable();
        expect(fixture.componentInstance.highlighted).toBe(2);
        piece(root, 2).dispatchEvent(new FocusEvent('blur'));
        await fixture.whenStable();
        expect(fixture.componentInstance.highlighted).toBeNull();
      });

      it('la pieza con número se llega con el teclado y dice cuál es', async () => {
        const root = await render(makeTable({ items }));
        expect(piece(root, 1).getAttribute('tabindex')).toBe('0');
        expect(piece(root, 1).getAttribute('role')).toBe('img');
        expect(piece(root, 1).getAttribute('aria-label')).toBe('1: Pinza Kelly');
      });

      it('la pieza sin número no se señala ni se llega con el teclado', async () => {
        const root = await render(
          makeTable({ items: [makeItem({ legendNumber: null, cells: [{ row: 1, column: 1 }] })] }),
        );
        const unnumbered = root.querySelector('.piece')!;
        expect(unnumbered.hasAttribute('tabindex')).toBe(false);
        expect(unnumbered.hasAttribute('aria-label')).toBe(false);
      });
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

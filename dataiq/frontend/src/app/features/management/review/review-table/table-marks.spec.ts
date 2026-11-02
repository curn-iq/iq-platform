import { TestBed } from '@angular/core/testing';
import type { TableChange } from '../../../../domain/version-diff';
import { TableMarks, type MarksSide } from './table-marks';

function change(overrides: Partial<TableChange>): TableChange {
  return {
    key: 'moved-6',
    kind: 'moved',
    number: 6,
    name: 'Separador',
    detail: '',
    fromCells: [{ row: 4, column: 4 }],
    toCells: [{ row: 4, column: 3 }],
    ...overrides,
  };
}

describe('TableMarks', () => {
  let root: HTMLElement;

  function mount(side: MarksSide, changes: TableChange[], active: number | null = null) {
    const fixture = TestBed.createComponent(TableMarks);
    fixture.componentRef.setInput('side', side);
    fixture.componentRef.setInput('columns', 6);
    fixture.componentRef.setInput('rows', 4);
    fixture.componentRef.setInput('changes', changes);
    fixture.componentRef.setInput('active', active);
    fixture.detectChanges();
    root = fixture.nativeElement;
  }

  const origin = (selector: string) => {
    const el = root.querySelector(selector)!;
    return [el.getAttribute('x'), el.getAttribute('y')];
  };

  it('usa la cuadrícula del diagrama: 100 unidades por celda', () => {
    mount('published', [change({})]);

    expect(root.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 600 400');
    expect(root.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('en la publicada contornea la celda de la que salió la pieza movida', () => {
    mount('published', [change({})]);

    expect(root.querySelectorAll('rect')).toHaveLength(1);
    expect(origin('.origin')).toEqual(['306', '306']);
  });

  it('en la propuesta rodea la celda a la que llegó, con el fantasma de su origen y el trayecto', () => {
    mount('proposed', [change({})]);

    expect(origin('.destination')).toEqual(['206', '306']);
    expect(origin('.origin')).toEqual(['306', '306']);
    expect(root.querySelector('.path')!.getAttribute('d')).toMatch(/^M350 350 L250 350/);
  });

  it('un objeto agregado solo marca su celda, en la propuesta', () => {
    const added = change({ kind: 'added', fromCells: [], toCells: [{ row: 2, column: 3 }] });

    mount('published', [added]);
    expect(root.querySelectorAll('rect')).toHaveLength(0);
  });

  it('un objeto agregado, en la propuesta, no lleva fantasma ni trayecto', () => {
    const added = change({ kind: 'added', fromCells: [], toCells: [{ row: 2, column: 3 }] });

    mount('proposed', [added]);

    expect(root.querySelectorAll('.destination')).toHaveLength(1);
    expect(root.querySelector('.origin')).toBeNull();
    expect(root.querySelector('.path')).toBeNull();
  });

  it('un objeto quitado solo marca su celda, en la publicada', () => {
    const removed = change({ kind: 'removed', fromCells: [{ row: 2, column: 3 }], toCells: [] });

    mount('published', [removed]);
    expect(root.querySelectorAll('.origin')).toHaveLength(1);
  });

  it('un objeto quitado no deja marcas en la propuesta', () => {
    const removed = change({ kind: 'removed', fromCells: [{ row: 2, column: 3 }], toCells: [] });

    mount('proposed', [removed]);

    expect(root.querySelectorAll('rect')).toHaveLength(0);
  });

  it('un objeto modificado sin moverse marca su celda sin trayecto', () => {
    const modified = change({
      kind: 'modified',
      fromCells: [{ row: 1, column: 1 }],
      toCells: [{ row: 1, column: 1 }],
    });

    mount('proposed', [modified]);

    expect(root.querySelectorAll('.destination')).toHaveLength(1);
    expect(root.querySelector('.path')).toBeNull();
    expect(root.querySelector('.origin')).toBeNull();
  });

  it('un objeto de varias celdas marca todas', () => {
    const wide = change({
      kind: 'moved',
      toCells: [
        { row: 1, column: 1 },
        { row: 1, column: 2 },
      ],
      fromCells: [
        { row: 3, column: 1 },
        { row: 3, column: 2 },
      ],
    });

    mount('proposed', [wide]);

    expect(root.querySelectorAll('.destination')).toHaveLength(2);
  });

  it('el cambio de la mesa entera no deja marcas', () => {
    const resized = change({ kind: 'resized', number: null, fromCells: [], toCells: [] });

    mount('proposed', [resized]);

    expect(root.querySelector('svg')!.children).toHaveLength(0);
  });

  it('señalar un cambio enciende sus marcas y traza el trayecto', () => {
    mount('proposed', [change({}), change({ key: 'moved-4', number: 4 })], 6);

    const paths = Array.from(root.querySelectorAll('.path'));
    expect(paths.map((p) => p.classList.contains('active'))).toEqual([true, false]);
    expect(root.querySelectorAll('.destination.active')).toHaveLength(1);
  });
});

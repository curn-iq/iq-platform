import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EditorSuture } from '../../../../domain/editor-content';
import { SutureRowChange, SutureRows } from './suture-rows';

const ROWS: EditorSuture[] = [
  { plane: 'Piel', name: 'Seda', gauge: '2/0', needle_type: 'cortante' },
  { plane: 'Fascia', name: 'Vicryl', gauge: '', needle_type: '' },
];

@Component({
  imports: [SutureRows],
  template: `<app-suture-rows
    [rows]="rows()"
    [missing]="missing()"
    [readonly]="readonly()"
    (changed)="changes.push($event)"
    (added)="adds = adds + 1"
    (removed)="removed.push($event)"
  />`,
})
class Host {
  readonly rows = signal<EditorSuture[]>(ROWS);
  readonly missing = signal(false);
  readonly readonly = signal(false);
  readonly changes: SutureRowChange[] = [];
  readonly removed: number[] = [];
  adds = 0;
}

describe('SutureRows', () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      rowElements: () => Array.from(root.querySelectorAll<HTMLElement>('.row')),
      values: (row: HTMLElement) =>
        Array.from(row.querySelectorAll<HTMLInputElement>('input')).map((input) => input.value),
    };
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('es una sección con su título, y una fila por plano', async () => {
    const { root, rowElements } = await mount();

    expect(text(root.querySelector('.title'))).toBe('Suturas por plano');
    expect(root.querySelector('section')!.getAttribute('aria-labelledby')).toBe(
      root.querySelector('.title')!.id,
    );
    expect(rowElements()).toHaveLength(2);
  });

  it('cada fila tiene sus cuatro cajas, con su nombre para quien no las ve y su texto de ayuda', async () => {
    const { rowElements } = await mount();

    const inputs = Array.from(rowElements()[0].querySelectorAll('input'));
    expect(inputs.map((i) => i.getAttribute('aria-label'))).toEqual([
      'Plano',
      'Sutura',
      'Calibre',
      'Aguja',
    ]);
    expect(inputs.map((i) => i.placeholder)).toEqual(['Plano', 'Sutura', 'Calibre', 'Aguja']);
  });

  it('cada caja muestra lo de su fila', async () => {
    const { rowElements, values } = await mount();

    expect(values(rowElements()[0])).toEqual(['Piel', 'Seda', '2/0', 'cortante']);
    expect(values(rowElements()[1])).toEqual(['Fascia', 'Vicryl', '', '']);
  });

  it('sin filas no hay lista, solo el botón para agregar', async () => {
    const { fixture, host, root } = await mount();

    host.rows.set([]);
    await fixture.whenStable();

    expect(root.querySelector('.rows')).toBeNull();
    expect(text(root.querySelector('.add'))).toBe('Agregar plano');
  });

  describe('«Falta»', () => {
    it('la pastilla del título solo sale si no hay ninguna sutura con nombre', async () => {
      const { fixture, host, root } = await mount();
      expect(root.querySelector('.badge')).toBeNull();

      host.missing.set(true);
      await fixture.whenStable();

      expect(text(root.querySelector('.title'))).toBe('Suturas por plano Falta');
    });
  });

  describe('editar', () => {
    it('al escribir en una caja avisa cuál fila, cuál campo y qué texto', async () => {
      const { fixture, host, rowElements } = await mount();
      const inputs = rowElements()[1].querySelectorAll('input');

      type(inputs[0], 'Piel profunda');
      type(inputs[1], 'Nylon');
      type(inputs[2], '4/0');
      type(inputs[3], 'redonda');
      await fixture.whenStable();

      expect(host.changes).toEqual([
        { index: 1, field: 'plane', value: 'Piel profunda' },
        { index: 1, field: 'name', value: 'Nylon' },
        { index: 1, field: 'gauge', value: '4/0' },
        { index: 1, field: 'needle_type', value: 'redonda' },
      ]);
    });

    it('lo que cambie fuera se ve en las cajas', async () => {
      const { fixture, host, rowElements, values } = await mount();

      host.rows.set([
        { plane: 'Músculo', name: 'Prolene', gauge: '3/0', needle_type: '' },
        ROWS[1],
      ]);
      await fixture.whenStable();

      expect(values(rowElements()[0])).toEqual(['Músculo', 'Prolene', '3/0', '']);
    });
  });

  describe('quitar', () => {
    it('cada fila tiene su botón, con su plano, y avisa la posición', async () => {
      const { host, root } = await mount();
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('.remove'));

      expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
        'Quitar Piel',
        'Quitar Fascia',
      ]);
      buttons[1].click();

      expect(host.removed).toEqual([1]);
    });

    it('una fila sin plano dice «Quitar plano»', async () => {
      const { fixture, host, root } = await mount();

      host.rows.set([{ plane: '', name: 'Seda', gauge: '', needle_type: '' }]);
      await fixture.whenStable();

      expect(root.querySelector('.remove')!.getAttribute('aria-label')).toBe('Quitar plano');
    });
  });

  describe('agregar', () => {
    it('«Agregar plano» avisa, y el foco va al plano de la fila nueva', async () => {
      const { fixture, host, root, rowElements } = await mount();

      root.querySelector<HTMLButtonElement>('.add')!.click();
      host.rows.set([...ROWS, { plane: '', name: '', gauge: '', needle_type: '' }]);
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));

      expect(host.adds).toBe(1);
      expect(rowElements()).toHaveLength(3);
      expect(document.activeElement).toBe(rowElements()[2].querySelector('input'));
    });
  });

  describe('«Falta la sutura.»', () => {
    it('sale en una fila con otros datos y sin sutura, y en ninguna otra', async () => {
      const { fixture, host, root } = await mount();
      expect(root.querySelector('.hint')).toBeNull();

      host.rows.set([
        { plane: 'Piel', name: '', gauge: '', needle_type: '' },
        { plane: '', name: '', gauge: '', needle_type: '' },
        ROWS[0],
      ]);
      await fixture.whenStable();

      const hints = Array.from(root.querySelectorAll('.row')).map(
        (row) => !!row.querySelector('.hint'),
      );
      expect(hints).toEqual([true, false, false]);
      expect(text(root.querySelector('.hint'))).toBe('Falta la sutura.');
    });
  });

  describe('en solo lectura', () => {
    it('se ven las filas, sin quitar ni agregar, y las cajas no se escriben', async () => {
      const { fixture, host, root, values, rowElements } = await mount();

      host.readonly.set(true);
      await fixture.whenStable();

      expect(values(rowElements()[0])).toEqual(['Piel', 'Seda', '2/0', 'cortante']);
      expect(root.querySelector('.remove')).toBeNull();
      expect(root.querySelector('.add')).toBeNull();
      expect(
        Array.from(root.querySelectorAll<HTMLInputElement>('input')).every((i) => i.readOnly),
      ).toBe(true);
    });
  });
});

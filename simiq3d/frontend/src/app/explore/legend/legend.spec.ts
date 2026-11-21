import { TestBed } from '@angular/core/testing';
import type { PieceChoice, TableItem } from '../../domain/mayo-table';
import { Legend } from './legend';

describe('Legend', () => {
  const component = (id: string, name: string) => ({ instrumentId: id, name });
  const items: TableItem[] = [
    {
      id: 'allis',
      legendNumber: 1,
      name: 'Pinza de Allis',
      instrumentIds: ['i-allis'],
      components: [component('i-allis', 'Pinza de Allis')],
      cells: [],
    },
    {
      id: 'corte',
      legendNumber: 6,
      name: 'Tijera de Mayo, Tijera de Metzenbaum, Mango N.° 3 y Mango N.° 4',
      instrumentIds: ['i-mayo', 'i-metz', 'i-m3', 'i-m4'],
      components: [
        component('i-mayo', 'Tijera de Mayo'),
        component('i-metz', 'Tijera de Metzenbaum'),
        component('i-m3', 'Mango de bisturí N.° 3'),
        component('i-m4', 'Mango de bisturí N.° 4'),
      ],
      cells: [],
    },
  ];

  async function render(inputs: { selected?: string | null; part?: number | null } = {}) {
    const fixture = TestBed.createComponent(Legend);
    fixture.componentRef.setInput('items', items);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    const chosen: PieceChoice[] = [];
    fixture.componentInstance.choose.subscribe((choice) => chosen.push(choice));
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const rows = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.piece'));
    return { root, rows, chosen, fixture };
  }

  it('cuenta y lista cada instrumento por separado, también los de un mismo objeto', async () => {
    const { root, rows } = await render();
    expect(root.querySelector('.count')?.textContent?.trim()).toBe('5');
    expect(
      rows().map((row) => [
        row.querySelector('.number')?.textContent?.trim(),
        row.querySelector('strong')?.textContent?.trim(),
      ]),
    ).toEqual([
      ['1', 'Pinza de Allis'],
      ['6', 'Tijera de Mayo'],
      ['6', 'Tijera de Metzenbaum'],
      ['6', 'Mango de bisturí N.° 3'],
      ['6', 'Mango de bisturí N.° 4'],
    ]);
  });

  it('tocar una fila elige su objeto y su instrumento', async () => {
    const { rows, chosen } = await render();
    rows()[3].click();
    expect(chosen).toEqual([{ id: 'corte', part: 2 }]);
  });

  it('con el objeto señalado entero, marca todas sus filas; con un instrumento, solo esa', async () => {
    const whole = await render({ selected: 'corte', part: null });
    expect(whole.rows().map((row) => row.getAttribute('aria-current'))).toEqual([
      'false',
      'true',
      'true',
      'true',
      'true',
    ]);

    const one = await render({ selected: 'corte', part: 1 });
    expect(one.rows().map((row) => row.getAttribute('aria-current'))).toEqual([
      'false',
      'false',
      'true',
      'false',
      'false',
    ]);
  });
});

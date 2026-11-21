import { TestBed } from '@angular/core/testing';
import type { PieceChoice, TableItem } from '../domain/mayo-table';
import { PieceList } from './piece-list';

describe('PieceList', () => {
  const items: TableItem[] = [
    {
      id: 'kelly',
      legendNumber: 9,
      name: 'Pinza Kelly',
      instrumentIds: ['i-kelly'],
      components: [{ instrumentId: 'i-kelly', name: 'Pinza Kelly' }],
      cells: [],
    },
    {
      id: 'gasa',
      legendNumber: null,
      name: 'Gasas',
      instrumentIds: ['i-gasa'],
      components: [{ instrumentId: 'i-gasa', name: 'Gasas' }],
      cells: [],
    },
    {
      id: 'diseccion',
      legendNumber: 5,
      name: 'Pinza de disección con garra y Pinza de disección sin garra',
      instrumentIds: ['i-con', 'i-sin'],
      components: [
        { instrumentId: 'i-con', name: 'Pinza de disección con garra' },
        { instrumentId: 'i-sin', name: 'Pinza de disección sin garra' },
      ],
      cells: [],
    },
  ];

  async function render() {
    const fixture = TestBed.createComponent(PieceList);
    fixture.componentRef.setInput('items', items);
    const chosen: PieceChoice[] = [];
    fixture.componentInstance.choose.subscribe((choice) => chosen.push(choice));
    await fixture.whenStable();
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    );
    return { buttons, chosen };
  }

  it('lista cada instrumento con el número de su objeto y lo señala al tocarlo', async () => {
    const { buttons, chosen } = await render();
    expect(buttons.map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '9 Pinza Kelly',
      '– Gasas',
      '5 Pinza de disección con garra',
      '5 Pinza de disección sin garra',
    ]);
    buttons[0].click();
    expect(chosen).toEqual([{ id: 'kelly', part: 0 }]);
  });

  it('los instrumentos de un mismo objeto son filas distintas que apuntan al mismo objeto', async () => {
    const { buttons, chosen } = await render();
    buttons[2].click();
    buttons[3].click();
    expect(chosen).toEqual([
      { id: 'diseccion', part: 0 },
      { id: 'diseccion', part: 1 },
    ]);
  });
});

import { TestBed } from '@angular/core/testing';
import type { TableItem } from '../domain/mayo-table';
import { PieceList } from './piece-list';

describe('PieceList', () => {
  const items: TableItem[] = [
    { id: 'kelly', legendNumber: 9, name: 'Pinza Kelly', instrumentIds: ['i-kelly'], cells: [] },
    { id: 'gasa', legendNumber: null, name: 'Gasas', instrumentIds: ['i-gasa'], cells: [] },
  ];

  it('lista cada objeto con su número y lo señala al tocarlo', async () => {
    const fixture = TestBed.createComponent(PieceList);
    fixture.componentRef.setInput('items', items);
    const chosen: string[] = [];
    fixture.componentInstance.choose.subscribe((id) => chosen.push(id));
    await fixture.whenStable();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    );
    expect(buttons.map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '9 Pinza Kelly',
      '– Gasas',
    ]);
    buttons[0].click();
    expect(chosen).toEqual(['kelly']);
  });
});

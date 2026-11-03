import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { placementIndex, type TechniqueUse } from '../../../../domain/instrument-catalog';
import type { Table, TableItem } from '../../../../domain/table';
import { WhereItGoes } from './where-it-goes';

function item(id: string, number: number | null, cells: [number, number][]): TableItem {
  return {
    id,
    legendNumber: number,
    name: id,
    components: [],
    instruments: [],
    cells: cells.map(([row, column]) => ({ row, column })),
  };
}

function table(name: string, columns: number, items: TableItem[]): Table {
  return { zoneId: `z-${name}`, name, rows: 4, columns, items };
}

function technique(
  id: string,
  name: string,
  specialty: string,
  tables: Table[],
  itemIds: string[],
): TechniqueUse {
  return {
    id,
    name,
    specialty,
    items: itemIds.map((itemId) => ({ id: itemId, components: [{ instrument_id: 'i-kelly' }] })),
    tables,
  };
}

const TECHNIQUES: TechniqueUse[] = [
  technique(
    't-1',
    'Tiroidectomía',
    'Cirugía general',
    [
      table('Mesa de Mayo', 7, [item('a', 4, [[1, 1]])]),
      table('Mesa de reserva', 8, [item('b', null, [[2, 2]])]),
    ],
    ['a', 'b'],
  ),
  technique(
    't-2',
    'Cesárea',
    'Ginecología',
    [table('Mesa de Mayo', 5, [item('c', 2, [[3, 3]])])],
    ['c'],
  ),
  technique(
    't-3',
    'Histerectomía laparoscópica',
    'Ginecología',
    [table('Mesa de reserva', 20, [item('d', 1, [[1, 20]])])],
    ['d'],
  ),
];

describe('WhereItGoes', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<WhereItGoes>>;
  let root: HTMLElement;

  function mount(specialties = ['Cirugía general', 'Ginecología', 'Urología'], id = 'i-kelly') {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
    fixture = TestBed.createComponent(WhereItGoes);
    fixture.componentRef.setInput('placements', placementIndex(TECHNIQUES).get(id) ?? []);
    fixture.componentRef.setInput('specialties', specialties);
    root = fixture.nativeElement;
    fixture.detectChanges();
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const rows = () => Array.from(root.querySelectorAll<HTMLElement>('.use'));

  it('titula «Dónde va» y explica qué muestra', () => {
    mount();

    expect(text(root.querySelector('h2'))).toBe('Dónde va');
    expect(text(root.querySelector('.head p'))).toBe(
      'Cada técnica publicada, con la celda que ocupa en su mesa',
    );
  });

  it('agrupa por especialidad en el orden dado, y las técnicas por nombre', () => {
    mount();

    expect(Array.from(root.querySelectorAll('h3')).map((h) => text(h))).toEqual([
      'Cirugía general',
      'Ginecología',
    ]);
    expect(rows().map((row) => text(row.querySelector('.data')))).toEqual([
      'Tiroidectomía Mesa de Mayo · n.° 4',
      'Tiroidectomía Mesa de reserva',
      'Cesárea Mesa de Mayo · n.° 2',
      'Histerectomía laparoscópica Mesa de reserva · n.° 1',
    ]);
  });

  it('un objeto sin número no dice «n.°»', () => {
    mount();

    expect(text(rows()[1].querySelector('span'))).toBe('Mesa de reserva');
  });

  it('cada fila lleva a la hoja de esa mesa en la técnica', () => {
    mount();

    expect(rows().map((row) => row.querySelector('a')!.getAttribute('href'))).toEqual([
      '/tecnicas/t-1/mesa-de-mayo',
      '/tecnicas/t-1/mesa-de-reserva',
      '/tecnicas/t-2/mesa-de-mayo',
      '/tecnicas/t-3/mesa-de-reserva',
    ]);
  });

  it('cada fila trae su mesa en miniatura, con el turno que escalona su encendido', () => {
    mount();

    const minis = rows().map((row) => row.querySelector('app-table-miniature'));
    expect(minis.every((mini) => mini !== null)).toBe(true);
    const lit = minis.map((mini) => mini!.querySelector('.cell.on')!.getAttribute('style'));
    expect(lit).toEqual(['--k: 0;', '--k: 1;', '--k: 2;', '--k: 3;']);
  });

  it('una mesa de más de 10 columnas ocupa la fila entera', () => {
    mount();

    expect(rows().map((row) => row.classList.contains('wide'))).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it('un instrumento que no está en ninguna mesa lo dice', () => {
    mount(['Cirugía general'], 'i-otro');

    expect(rows()).toHaveLength(0);
    expect(text(root.querySelector('.none'))).toBe(
      'Todavía no está en ninguna mesa cargada. Puede estar en el listado de instrumental de alguna técnica.',
    );
  });

  it('una especialidad que no está en la lista va al final', () => {
    mount(['Ginecología']);

    expect(Array.from(root.querySelectorAll('h3')).map((h) => text(h))).toEqual([
      'Ginecología',
      'Cirugía general',
    ]);
  });
});

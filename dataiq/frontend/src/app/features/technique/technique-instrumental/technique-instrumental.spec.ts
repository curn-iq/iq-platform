import { TestBed } from '@angular/core/testing';
import type { TechniqueInstruments } from '../../../data/api/models';
import { TechniqueInstrumental } from './technique-instrumental';

const INSTRUMENTS: TechniqueInstruments = {
  zones: [],
  items: [
    {
      id: 'i-1',
      zone_id: null,
      zone: null,
      legend_number: null,
      source_text: 'Pinza Kelly',
      components: [{ instrument_id: 'x1', suture_id: null, name: 'Pinza Kelly' }],
      cells: [],
    },
    {
      id: 'i-2',
      zone_id: 'z-mayo',
      zone: 'Mesa de Mayo',
      legend_number: 1,
      source_text: 'Mango y hoja',
      components: [
        { instrument_id: 'x2', suture_id: null, name: 'Mango de bisturí N.° 3' },
        { instrument_id: 'x3', suture_id: null, name: 'Hoja de bisturí #15' },
      ],
      cells: [{ row: 1, column: 1 }],
    },
  ],
  sutures: [
    {
      id: 's-1',
      name: 'Seda',
      gauge: '2/0',
      needle_type: 'aguja cortante de 3/8 de círculo',
      usage: 'Piel; Fascia',
    },
    { id: 's-2', name: 'Vicryl', gauge: '3/0', needle_type: null, usage: 'Músculo' },
  ],
  equipment: [
    { id: 'e-1', name: 'Electrobisturí', description: null },
    { id: 'e-2', name: 'Bisturí armónico', description: null },
  ],
  devices: [{ id: 'd-1', name: 'Campo adhesivo', description: null }],
};

describe('TechniqueInstrumental', () => {
  let root: HTMLElement;

  async function mount(instruments: TechniqueInstruments = INSTRUMENTS) {
    const fixture = TestBed.createComponent(TechniqueInstrumental);
    fixture.componentRef.setInput('instruments', instruments);
    root = fixture.nativeElement;
    await fixture.whenStable();
  }

  const titles = () => Array.from(root.querySelectorAll('h2')).map((h) => h.textContent);
  const rows = () =>
    Array.from(root.querySelectorAll('.sutures div')).map((div) => [
      div.querySelector('dt')?.textContent ?? null,
      div.querySelector('dd')!.textContent,
    ]);

  it('lista los objetos de la técnica, también los que no tienen lugar en la mesa', async () => {
    await mount();

    expect(Array.from(root.querySelectorAll('.objects li')).map((li) => li.textContent)).toEqual([
      'Pinza Kelly',
      'Mango de bisturí N.° 3 y Hoja de bisturí #15',
    ]);
  });

  it('las suturas van una fila por plano, con el plano y la sutura', async () => {
    await mount();

    expect(rows()).toEqual([
      ['Piel', 'Seda 2/0, aguja cortante de 3/8 de círculo'],
      ['Fascia', 'Seda 2/0, aguja cortante de 3/8 de círculo'],
      ['Músculo', 'Vicryl 3/0'],
    ]);
  });

  it('los equipos y el equipo médico-quirúrgico llevan su título', async () => {
    await mount();

    expect(titles()).toEqual(['Equipos biomédicos', 'Equipo médico-quirúrgico', 'Suturas']);
    const texts = Array.from(root.querySelectorAll('.supplies p')).map((p) => p.textContent);
    expect(texts).toEqual(['Electrobisturí, Bisturí armónico', 'Campo adhesivo']);
  });

  it('una sutura sin plano va en una fila sin plano', async () => {
    await mount({
      ...INSTRUMENTS,
      sutures: [{ id: 's-3', name: 'Seda', gauge: '0', needle_type: null, usage: null }],
    });

    expect(rows()).toEqual([[null, 'Seda 0']]);
    expect(root.querySelector('.sutures .no-plane')).not.toBeNull();
  });

  it('lo que la técnica no trae no se muestra: ni títulos ni listas vacías', async () => {
    await mount({ ...INSTRUMENTS, sutures: [], equipment: [], devices: [] });

    expect(titles()).toEqual([]);
    expect(root.querySelector('.more')).toBeNull();
    expect(root.querySelectorAll('.objects li')).toHaveLength(2);
  });

  it('una técnica sin nada deja la hoja vacía', async () => {
    await mount({ zones: [], items: [], sutures: [], equipment: [], devices: [] });

    expect(root.textContent!.trim()).toBe('');
  });
});

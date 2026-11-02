import { TestBed } from '@angular/core/testing';
import type { Instrument } from '../../data/api/models';
import { InstrumentCard } from './instrument-card';

describe('InstrumentCard', () => {
  const instrument = (id: string, name: string, description: string | null) =>
    ({ id, name, description, description_source: null, category: '', aliases: [] }) as Instrument;

  async function render(instruments: Instrument[]) {
    const fixture = TestBed.createComponent(InstrumentCard);
    fixture.componentRef.setInput('item', {
      id: 'bisturi',
      legendNumber: 7,
      name: 'Mango de bisturí N.° 3 y Hoja de bisturí #15',
      instrumentIds: instruments.map((i) => i.id),
      cells: [],
    });
    fixture.componentRef.setInput('instruments', instruments);
    fixture.componentRef.setInput('dataiqUrl', '/tecnicas/t-1/mesa-de-mayo');
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra el número, el nombre y la descripción de DataIQ', async () => {
    const card = await render([instrument('i-kelly', 'Pinza Kelly', 'Pinza hemostática curva.')]);
    expect(card.querySelector('.number')?.textContent).toContain('7');
    expect(card.querySelector('.text')?.textContent).toContain('Pinza hemostática curva.');
    expect(card.querySelector('a')?.getAttribute('href')).toBe('/tecnicas/t-1/mesa-de-mayo');
  });

  it('un objeto de varios instrumentos muestra la descripción de cada uno con su nombre', async () => {
    const card = await render([
      instrument('i-mango', 'Mango de bisturí N.° 3', 'Sostiene la hoja.'),
      instrument('i-hoja', 'Hoja de bisturí #15', null),
    ]);
    const text = card.querySelector('.text')?.textContent ?? '';
    expect(text).toContain('Mango de bisturí N.° 3.');
    expect(text).toContain('Sostiene la hoja.');
    expect(text).toContain('Sin descripción en DataIQ.');
  });
});

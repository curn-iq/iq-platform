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
    await fixture.whenStable();
    return { card: fixture.nativeElement as HTMLElement, fixture };
  }

  it('muestra el número, el nombre y la primera oración de la descripción; el resto, con «Ver más»', async () => {
    const { card, fixture } = await render([
      instrument('i-kelly', 'Pinza Kelly', 'Pinza hemostática curva. Sirve para pinzar vasos.'),
    ]);
    expect(card.querySelector('.number')?.textContent).toContain('7');
    expect(card.querySelector('h2')?.textContent).toContain(
      'Mango de bisturí N.° 3 y Hoja de bisturí #15',
    );
    const text = () => card.querySelector('.text')?.textContent ?? '';
    expect(text()).toContain('Pinza hemostática curva.');
    expect(text()).not.toContain('Sirve para pinzar vasos.');

    card.querySelector<HTMLButtonElement>('.more')!.click();
    await fixture.whenStable();
    expect(text()).toContain('Pinza hemostática curva. Sirve para pinzar vasos.');
    expect(card.querySelector('.more')?.textContent).toContain('Ver menos');
  });

  it('sin más que una oración no ofrece «Ver más»', async () => {
    const { card } = await render([instrument('i-kelly', 'Pinza Kelly', 'Pinza hemostática.')]);
    expect(card.querySelector('.more')).toBeNull();
  });

  it('un objeto de varios instrumentos muestra la descripción de cada uno con su nombre', async () => {
    const { card } = await render([
      instrument('i-mango', 'Mango de bisturí N.° 3', 'Sostiene la hoja.'),
      instrument('i-hoja', 'Hoja de bisturí #15', null),
    ]);
    const text = card.querySelector('.text')?.textContent ?? '';
    expect(text).toContain('Mango de bisturí N.° 3.');
    expect(text).toContain('Sostiene la hoja.');
    expect(text).toContain('Sin descripción en DataIQ.');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { CatalogInstrument } from '../../../../../domain/instrumental-picker';
import { ObjectPicker } from './object-picker';

const instrument = (
  id: string,
  name: string,
  category: string,
  aliases: string[] = [],
): CatalogInstrument => ({ id, name, category, aliases });

const KELLY = instrument('i-kelly', 'Pinza Kelly', 'Pinza');
const MOYNIHAN = instrument('i-moy', 'Pinza de Moynihan', 'Pinza', ['Pinza Moninjan']);
const GASA = instrument('i-gasa', 'Gasa', 'Accesorios');

describe('ObjectPicker', () => {
  let fixture: ComponentFixture<ObjectPicker>;
  let root: HTMLElement;
  const picked: CatalogInstrument[] = [];
  let closed = 0;

  async function mount(
    inputs: { present?: string[]; quick?: CatalogInstrument[]; quickLabel?: string } = {},
  ): Promise<void> {
    picked.length = 0;
    closed = 0;
    fixture = TestBed.createComponent(ObjectPicker);
    fixture.componentRef.setInput('instruments', [KELLY, MOYNIHAN, GASA]);
    fixture.componentRef.setInput('categoryOrder', ['Accesorios', 'Pinza']);
    fixture.componentRef.setInput('present', new Set(inputs.present ?? []));
    fixture.componentRef.setInput('quick', inputs.quick ?? []);
    fixture.componentRef.setInput('quickLabel', inputs.quickLabel ?? '');
    fixture.componentInstance.picked.subscribe((value) => picked.push(value));
    fixture.componentInstance.closed.subscribe(() => closed++);
    root = fixture.nativeElement;
    await fixture.whenStable();
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const rows = () => Array.from(root.querySelectorAll<HTMLElement>('.row'));
  const type = async (value: string) => {
    const input = root.querySelector('input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  it('lista el catálogo por categoría, en el orden del catálogo', async () => {
    await mount();
    expect(Array.from(root.querySelectorAll('.group')).map(text)).toEqual(['Accesorios', 'Pinza']);
    expect(rows().map((row) => text(row.firstElementChild))).toEqual([
      'Gasa',
      'Pinza de Moynihan',
      'Pinza Kelly',
    ]);
  });

  it('al abrirse, el foco está en el buscador', async () => {
    await mount();
    expect(root.querySelector('input')).toBe(document.activeElement);
  });

  it('busca por nombre o por alias', async () => {
    await mount();
    await type('moninjan');
    expect(rows().map((row) => text(row.firstElementChild))).toEqual(['Pinza de Moynihan']);
    await type('zzz');
    expect(rows()).toHaveLength(0);
    expect(text(root.querySelector('.empty'))).toContain('Ningún instrumento coincide');
  });

  it('elegir una fila avisa con el instrumento y deja el panel abierto', async () => {
    await mount();
    rows()[0].click();
    expect(picked).toEqual([GASA]);
    expect(closed).toBe(0);
  });

  it('lo que ya está en la mesa se marca y no se vuelve a elegir', async () => {
    await mount({ present: ['i-gasa'] });
    const gasa = rows()[0];
    expect(gasa.getAttribute('aria-pressed')).toBe('true');
    expect(gasa.getAttribute('aria-disabled')).toBe('true');
    expect(text(gasa)).toContain('En la mesa');
    gasa.click();
    expect(picked).toEqual([]);
    expect(text(rows()[1])).toContain('Agregar');
  });

  it('«Listo» y Escape lo cierran', async () => {
    await mount();
    root.querySelector<HTMLElement>('.done')!.click();
    expect(closed).toBe(1);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(2);
  });

  describe('atajos', () => {
    it('sin atajos no hay fila de atajos', async () => {
      await mount();
      expect(root.querySelector('.quick')).toBeNull();
    });

    it('con atajos, los muestra con su título; elegir uno avisa y el que ya está queda marcado', async () => {
      await mount({
        quick: [GASA, KELLY],
        quickLabel: 'Más usados en mesas de reserva',
        present: ['i-kelly'],
      });
      expect(text(root.querySelector('.sub'))).toBe('Más usados en mesas de reserva');
      const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('.chip'));
      expect(chips.map(text)).toEqual(['Gasa', 'Pinza Kelly']);
      expect(chips[1].getAttribute('aria-pressed')).toBe('true');
      expect(chips[1].disabled).toBe(true);
      chips[0].click();
      expect(picked).toEqual([GASA]);
    });
  });
});

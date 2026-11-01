import { TestBed } from '@angular/core/testing';
import { HomeFaq } from './faq';

describe('HomeFaq', () => {
  async function mount(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(HomeFaq);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('es la sección «preguntas», a la que enlazan la barra y el pie', async () => {
    const root = await mount();
    const section = root.querySelector('section')!;

    expect(section.id).toBe('preguntas');
    expect(section.getAttribute('aria-labelledby')).toBe('faq-title');
    expect(root.querySelector('h2')!.textContent).toBe('Preguntas frecuentes.');
  });

  it('tiene tres grupos y solo el primero, Cuenta, abierto', async () => {
    const root = await mount();
    const groups = Array.from(root.querySelectorAll<HTMLDetailsElement>('details.group'));

    expect(groups.map((g) => g.querySelector('summary')!.textContent!.trim())).toEqual([
      'Cuenta',
      'Técnicas',
      'Herramientas',
    ]);
    expect(groups.map((g) => g.open)).toEqual([true, false, false]);
  });

  it('cada grupo lista sus preguntas con su respuesta', async () => {
    const root = await mount();
    const counts = Array.from(root.querySelectorAll('details.group')).map(
      (group) => group.querySelectorAll('.questions details').length,
    );

    expect(counts).toEqual([3, 2, 3]);
    const first = root.querySelector('.questions details')!;
    expect(first.querySelector('summary')!.textContent!.trim()).toBe('¿Cuánto cuesta?');
    expect(first.querySelector('p')!.textContent).toBe('Nada. La cuenta es gratuita.');
  });

  it('no explica el funcionamiento interno', async () => {
    const text = (await mount()).textContent!;

    expect(text).not.toMatch(/revisor|base de datos|licencia/i);
  });

  it('no enlaza a ninguna ayuda: no existe en el MVP', async () => {
    const root = await mount();

    expect(root.querySelector('a')).toBeNull();
  });
});

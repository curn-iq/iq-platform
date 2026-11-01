import { TestBed } from '@angular/core/testing';
import { HomeAudience } from './audience';

describe('HomeAudience', () => {
  async function mount(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(HomeAudience);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('es la sección «quien», a la que enlazan «Guía para estudiantes» y «Para docentes»', async () => {
    const root = await mount();
    const section = root.querySelector('section')!;

    expect(section.id).toBe('quien');
    expect(section.getAttribute('aria-labelledby')).toBe('audience-title');
    expect(root.querySelector('h2')!.textContent).toBe('Para quien estudia y para quien enseña.');
  });

  it('tiene los perfiles de Estudiantes y Docentes, cada uno con su pictograma decorativo', async () => {
    const root = await mount();
    const profiles = Array.from(root.querySelectorAll('.profile'));

    expect(profiles.map((p) => p.querySelector('h3')!.textContent)).toEqual([
      'Estudiantes',
      'Docentes',
    ]);
    expect(profiles[0].querySelector('p')!.textContent).toBe(
      'Repasar cada técnica las veces que haga falta, al propio ritmo.',
    );
    for (const profile of profiles) {
      expect(profile.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    }
  });
});

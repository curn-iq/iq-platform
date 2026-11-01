import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeHero } from './hero';

describe('HomeHero', () => {
  async function mount(): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomeHero);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('es la sección «inicio», con un solo titular', async () => {
    const root = await mount();
    const section = root.querySelector('section')!;

    expect(section.id).toBe('inicio');
    expect(section.getAttribute('aria-labelledby')).toBe('hero-title');
    expect(root.querySelectorAll('h1').length).toBe(1);
  });

  it('el titular se lee de corrido aunque se dibuje en tres líneas', async () => {
    const h1 = (await mount()).querySelector('h1')!;

    expect(h1.getAttribute('aria-label')).toBe('La mesa de cada técnica, lista para practicar.');
    const lines = Array.from(h1.querySelectorAll('.line'));
    expect(lines.map((line) => line.textContent)).toEqual([
      'La mesa de',
      'cada técnica,',
      'lista para practicar.',
    ]);
    expect(lines.every((line) => line.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('explica qué se puede hacer con la mesa', async () => {
    const lede = (await mount()).querySelector('.lede')!;

    expect(lede.textContent!.trim()).toBe(
      'Consultarla, verla en 3D y comprobarla con la cámara, fuera del laboratorio.',
    );
  });

  it('la acción principal es crear la cuenta', async () => {
    const link = (await mount()).querySelector<HTMLAnchorElement>('a[app-button]')!;

    expect(link.textContent!.trim()).toBe('Crear cuenta gratis');
    expect(link.getAttribute('href')).toBe('/cuenta/crear');
  });

  it('«Ver cómo funciona» baja al carril de las herramientas', async () => {
    const link = (await mount()).querySelector<HTMLAnchorElement>('a[app-arrow-link]')!;

    expect(link.textContent!.trim()).toBe('Ver cómo funciona');
    expect(link.getAttribute('href')).toBe('/#camino');
    expect(link.getAttribute('data-direction')).toBe('down');
  });

  it('a la derecha va el escenario de la mesa', async () => {
    const root = await mount();

    expect(root.querySelector('app-hero-stage [role=tablist]')).not.toBeNull();
  });
});

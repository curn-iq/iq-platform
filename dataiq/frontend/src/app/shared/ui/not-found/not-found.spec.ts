import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';

describe('NotFound', () => {
  let root: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();
    root = fixture.nativeElement;
  });

  it('dice que la página no existe, con un solo titular', () => {
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('h1')?.textContent).toBe('No encontrada.');
    expect(root.querySelector('p')?.textContent).toBe(
      'La página que se busca no existe o cambió de dirección.',
    );
  });

  it('lleva al catálogo y al inicio', () => {
    const links = Array.from(root.querySelectorAll('a')).map((a) => [
      a.textContent,
      a.getAttribute('href'),
    ]);

    expect(links).toEqual([
      ['Ver todas las técnicas', '/tecnicas'],
      ['Ir al inicio', '/'],
    ]);
  });

  it('el catálogo es la acción principal y el inicio la suave', () => {
    const variants = Array.from(root.querySelectorAll('a')).map((a) =>
      a.getAttribute('data-variant'),
    );

    expect(variants).toEqual(['primary', 'soft']);
  });
});

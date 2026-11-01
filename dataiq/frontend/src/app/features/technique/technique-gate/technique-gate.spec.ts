import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GatePreview, TechniqueGate } from './technique-gate';

describe('TechniqueGate', () => {
  let root: HTMLElement;

  async function mount(preview: GatePreview = 'table') {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TechniqueGate);
    fixture.componentRef.setInput('preview', preview);
    fixture.componentRef.setInput('title', 'Ver la mesa de Mayo');
    fixture.componentRef.setInput(
      'text',
      'Con una cuenta gratuita se abre la mesa de Mayo de esta técnica.',
    );
    fixture.componentRef.setInput('returnTo', '/tecnicas/t-1/mesa-de-mayo');
    root = fixture.nativeElement;
    await fixture.whenStable();
  }

  const link = (text: string) =>
    Array.from(root.querySelectorAll<HTMLAnchorElement>('.gate a')).find(
      (a) => a.textContent!.trim() === text,
    )!;

  describe('la tarjeta', () => {
    it('dice qué abre la cuenta, sin prometer contenido', async () => {
      await mount();

      expect(root.querySelector('.gate strong')!.textContent).toBe('Ver la mesa de Mayo');
      expect(root.querySelector('.gate p')!.textContent).toBe(
        'Con una cuenta gratuita se abre la mesa de Mayo de esta técnica.',
      );
    });

    it('lleva un candado que los lectores de pantalla ignoran', async () => {
      await mount();

      expect(root.querySelector('.lock')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('«Crear cuenta gratis» y «Ya tengo cuenta» llevan a la cuenta con la técnica a la que volver', async () => {
      await mount();

      expect(link('Crear cuenta gratis').getAttribute('href')).toBe(
        '/cuenta/crear?volver=%2Ftecnicas%2Ft-1%2Fmesa-de-mayo',
      );
      expect(link('Ya tengo cuenta').getAttribute('href')).toBe(
        '/cuenta/ingresar?volver=%2Ftecnicas%2Ft-1%2Fmesa-de-mayo',
      );
    });
  });

  describe('el vistazo de una mesa', () => {
    it('es la variante de vista previa de la mesa, sin objetos ni números', async () => {
      await mount('table');

      const diagram = root.querySelector('app-table-diagram')!;
      expect(diagram.getAttribute('data-variant')).toBe('preview');
      expect(diagram.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
      expect(diagram.querySelectorAll('.piece, .number')).toHaveLength(0);
    });

    it('es la misma para toda técnica: no depende de ningún dato', async () => {
      await mount('table');
      const first = root.querySelector('app-table-diagram')!.innerHTML;
      TestBed.resetTestingModule();
      await mount('table');

      expect(
        root.querySelector('app-table-diagram')!.innerHTML.replace(/steel-\d+|blade-\d+/g, ''),
      ).toBe(first.replace(/steel-\d+|blade-\d+/g, ''));
    });

    it('no muestra la lista de objetos', async () => {
      await mount('table');

      expect(root.querySelector('.objects')).toBeNull();
    });
  });

  describe('el vistazo del instrumental', () => {
    it('son dos filas de tres barras, sin texto, ocultas a los lectores de pantalla', async () => {
      await mount('objects');

      const list = root.querySelector('.objects')!;
      expect(list.getAttribute('aria-hidden')).toBe('true');
      expect(list.querySelectorAll('li .bone')).toHaveLength(6);
      expect(list.textContent!.trim()).toBe('');
      expect(root.querySelector('app-table-diagram')).toBeNull();
    });
  });
});

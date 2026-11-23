import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { MARKERS_PDF_URL, SOURCE_URL } from '../links';
import { DESKTOP_QUERY } from '../shared/media-query';
import { EntryPage } from './entry-page';

function render(desktop: boolean): HTMLElement {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: desktop && query === DESKTOP_QUERY,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(EntryPage);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const texts = (root: HTMLElement, selector: string) =>
  Array.from(root.querySelectorAll(selector)).map((e) => e.textContent?.trim());

describe('EntryPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('en el celular', () => {
    it('explica qué hace SIVRI y lleva a la cámara', () => {
      const root = render(false);
      expect(root.querySelector('h1')?.textContent).toContain(
        'La mesa armada, revisada por la cámara.',
      );
      const open = root.querySelector<HTMLAnchorElement>('a[appButton]');
      expect(open?.textContent?.trim()).toBe('Abrir la cámara');
      expect(open?.getAttribute('href')).toBe('/camara');
    });

    it('no muestra el código QR ni la explicación de usarlo desde el celular', () => {
      const root = render(false);
      expect(root.querySelector('.qr')).toBeNull();
      expect(texts(root, 'h2')).not.toContain('Se usa desde el celular');
    });
  });

  describe('en el computador', () => {
    it('no tiene camino a la cámara', () => {
      const root = render(true);
      expect(root.querySelector('a[appButton]')).toBeNull();
      expect(root.querySelector('a[href="/camara"]')).toBeNull();
    });

    it('lleva al celular con la dirección y un código QR', () => {
      const root = render(true);
      expect(texts(root, 'h2')).toContain('Se usa desde el celular');
      const qr = root.querySelector<HTMLImageElement>('img.qr');
      expect(qr?.getAttribute('src')).toBe('qr-sivri.svg');
      expect(qr?.alt).toContain('Código QR');
      expect(root.querySelector('.url')?.textContent?.trim()).toBe(
        environment.publicUrl.replace(/^https?:\/\//, ''),
      );
    });
  });

  describe('en los dos', () => {
    it.each([false, true])(
      'dice lo que hace falta antes de empezar (computador: %s)',
      (desktop) => {
        const root = render(desktop);
        expect(texts(root, 'h2')).toContain('Lo que hace falta antes de empezar.');
        expect(texts(root, '.name')).toEqual(['La mesa', 'Las técnicas']);
        expect(texts(root, '.row-title')).toContain('Los cuatro marcadores');
        expect(texts(root, '.row-title')).toContain('Mastectomía y Tiroidectomía');
      },
    );

    it.each([false, true])(
      '«Cómo se prepara la mesa» lleva a esa sección (computador: %s)',
      (desktop) => {
        const root = render(desktop);
        const link = Array.from(root.querySelectorAll('a')).find((a) =>
          a.textContent?.includes('Cómo se prepara la mesa'),
        );
        expect(link?.getAttribute('href')).toContain('#lo-que-hace-falta');
        expect(root.querySelector('#lo-que-hace-falta')).not.toBeNull();
      },
    );

    it('enlaza el PDF de los marcadores y las mesas de DataIQ', () => {
      const root = render(false);
      const links = Array.from(root.querySelectorAll('a'));
      const pdf = links.find((a) => a.textContent?.includes('Descargar los marcadores (PDF)'));
      expect(pdf?.getAttribute('href')).toBe(MARKERS_PDF_URL);
      expect(pdf?.getAttribute('rel')).toContain('noopener');
      const mesas = links.find((a) => a.textContent?.includes('Ver las mesas en DataIQ'));
      expect(mesas?.getAttribute('href')).toBe(`${environment.shellUrl}/tecnicas`);
    });

    it('lleva el pie: las imágenes no se guardan y el código fuente es AGPL-3.0', () => {
      const root = render(false);
      expect(root.textContent).toContain('Las imágenes se procesan y no se guardan.');
      const source = Array.from(root.querySelectorAll('a')).find(
        (a) => a.textContent?.trim() === 'Código fuente (AGPL-3.0)',
      );
      expect(source?.getAttribute('href')).toBe(SOURCE_URL);
    });

    it('las fotos llevan su descripción y sus anchos', () => {
      const root = render(true);
      for (const photo of Array.from(root.querySelectorAll('img.wide, img.phone-photo'))) {
        expect((photo as HTMLImageElement).alt.length).toBeGreaterThan(10);
        expect(photo.getAttribute('srcset')).toContain('800w');
      }
    });
  });
});

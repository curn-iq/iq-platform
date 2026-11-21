import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { About } from './about';

describe('About', () => {
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(About);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  describe('presentación', () => {
    it('tiene un solo titular de nivel 1, el del Figma', () => {
      const headings = root.querySelectorAll('h1');

      expect(headings).toHaveLength(1);
      expect(headings[0].textContent).toBe(
        'Donde la tecnología se encuentra con la práctica quirúrgica.',
      );
    });

    it('lleva la entradilla del mockup', () => {
      const text = root.querySelector('.lead p')!.textContent!.replace(/\s+/g, ' ').trim();

      expect(text).toBe(
        'IQ Platform nace en la Corporación Universitaria Rafael Núñez, entre dos programas. ' +
          'Instrumentación Quirúrgica aporta las técnicas, el instrumental y su lugar en la mesa; ' +
          'Ingeniería de Sistemas lo lleva a una consulta, a una vista en 3D y a la cámara.',
      );
    });

    it('«Ver cómo funciona» lleva a la sección «Cómo funciona» del inicio', () => {
      const link = root.querySelector<HTMLAnchorElement>('.lead a')!;

      expect(link.textContent!.trim()).toBe('Ver cómo funciona');
      expect(link.getAttribute('href')).toBe('/#camino');
    });

    it('la flecha del enlace es decorativa', () => {
      expect(root.querySelector('.lead a svg')!.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('carrusel', () => {
    it('va bajo la presentación, con las cuatro fotos y su nombre', () => {
      const carousel = root.querySelector('app-photo-carousel')!;

      expect(carousel.previousElementSibling).toBe(root.querySelector('header'));
      expect(carousel.getAttribute('aria-label')).toBe('Fotos del equipo y del laboratorio');
      expect(carousel.querySelectorAll('img')).toHaveLength(4);
    });
  });
});

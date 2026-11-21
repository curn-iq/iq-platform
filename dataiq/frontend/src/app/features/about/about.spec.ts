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

  describe('los dos programas', () => {
    const programs = () => Array.from(root.querySelectorAll('.program'));

    it('van Instrumentación Quirúrgica y después Ingeniería de Sistemas, con sus dos párrafos', () => {
      expect(programs().map((p) => p.querySelector('h2')!.textContent)).toEqual([
        'Instrumentación Quirúrgica',
        'Ingeniería de Sistemas',
      ]);
      expect(programs().map((p) => p.querySelectorAll('.program-text p').length)).toEqual([2, 2]);
      expect(programs()[1].querySelector('.program-text p')!.textContent).toContain(
        'entrenar el modelo YOLO',
      );
    });

    it('cada foto es decorativa y dice que es ilustrativa y sin relación con el equipo', () => {
      for (const program of programs()) {
        const img = program.querySelector('img')!;
        const mark = program.querySelector('.mark')!;

        expect(img.getAttribute('alt')).toBe('');
        expect(mark.querySelector('[aria-hidden="true"]')!.textContent).toBe(
          'foto ilustrativa · Pexels',
        );
        expect(mark.querySelector('.sr-only')!.textContent).toBe(
          'Foto ilustrativa de Pexels, sin relación con el equipo.',
        );
      }
    });

    it('las fotos cargan perezosas con sus dos anchos', () => {
      const img = programs()[0].querySelector('img')!;

      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('srcset')).toBe(
        '/nosotros/programa-instrumentacion-750.webp 750w, /nosotros/programa-instrumentacion-1423.webp 1423w',
      );
    });
  });

  describe('conoce al equipo', () => {
    it('lleva el título, el texto en primera persona y los dos grupos con tres personas cada uno', () => {
      const team = root.querySelector('.team')!;

      expect(team.querySelector('h2')!.textContent).toBe('Las personas detrás del proyecto.');
      expect(team.querySelector('.team-head p')!.textContent).toContain(
        'Somos un grupo de estudiantes',
      );
      expect(
        Array.from(team.querySelectorAll('app-team-group')).map(
          (group) => group.querySelectorAll('app-portrait').length,
        ),
      ).toEqual([3, 3]);
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

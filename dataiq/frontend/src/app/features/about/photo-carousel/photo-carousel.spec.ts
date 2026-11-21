import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CAROUSEL_PHOTOS } from '../about-photos';
import { PhotoCarousel } from './photo-carousel';

const LABEL = 'Fotos del equipo y del laboratorio';

describe('PhotoCarousel', () => {
  let fixture: ComponentFixture<PhotoCarousel>;

  const host = () => fixture.nativeElement as HTMLElement;
  const slides = () => Array.from(host().querySelectorAll<HTMLImageElement>('img.slide'));
  /** La posición de la foto que se ve. */
  const active = () => slides().findIndex((slide) => slide.classList.contains('active'));
  const settle = () => fixture.detectChanges();
  /** Pasa `ms` de tiempo simulado y deja que el componente se actualice. */
  const wait = (ms: number) => {
    vi.advanceTimersByTime(ms);
    settle();
  };
  /** Un evento de puntero: jsdom no trae `PointerEvent`, y al componente le basta con estos datos. */
  const pointer = (type: string, init: { clientX?: number; pointerType?: string } = {}) => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: init.clientX ?? 0 });
    Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
    host().dispatchEvent(event);
    settle();
  };
  const focus = (type: 'focusin' | 'focusout') => {
    host().dispatchEvent(new FocusEvent(type, { bubbles: true }));
    settle();
  };
  const key = (name: string) =>
    host().dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
    );

  function create(reducedMotion = false): void {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: reducedMotion && query.includes('prefers-reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    fixture = TestBed.createComponent(PhotoCarousel);
    fixture.componentRef.setInput('photos', CAROUSEL_PHOTOS);
    fixture.componentRef.setInput('label', LABEL);
    settle();
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('fotos', () => {
    beforeEach(() => create());

    it('muestra las cuatro fotos en su orden, cada una con su texto alternativo', () => {
      expect(slides().map((slide) => slide.getAttribute('alt'))).toEqual([
        'Parte del equipo en el laboratorio.',
        'El laboratorio de Instrumentación Quirúrgica.',
        'Quirófano de simulación: la mesa de Mayo sobre el campo.',
        'Mesa de Mayo vestida, lista para el instrumental.',
      ]);
    });

    it('la primera lleva prioridad y las demás cargan perezosas', () => {
      expect(slides().map((slide) => slide.getAttribute('fetchpriority'))).toEqual([
        'high',
        'auto',
        'auto',
        'auto',
      ]);
      expect(slides().map((slide) => slide.getAttribute('loading'))).toEqual([
        'eager',
        'lazy',
        'lazy',
        'lazy',
      ]);
    });

    it('cada foto trae su tamaño y sus tres anchos para el srcset', () => {
      const [team, lab] = slides();

      expect(team.getAttribute('width')).toBe('2400');
      expect(team.getAttribute('height')).toBe('1800');
      expect(lab.getAttribute('height')).toBe('1367');
      expect(team.getAttribute('src')).toBe('/nosotros/carrusel-1-1500.webp');
      expect(team.getAttribute('srcset')).toBe(
        '/nosotros/carrusel-1-800.webp 800w, /nosotros/carrusel-1-1500.webp 1500w, /nosotros/carrusel-1-2400.webp 2400w',
      );
    });

    it('solo la foto que se ve la leen los lectores de pantalla', () => {
      expect(slides().map((slide) => slide.getAttribute('aria-hidden'))).toEqual([
        null,
        'true',
        'true',
        'true',
      ]);
    });

    it('no lleva flechas, contador, puntos ni botones', () => {
      expect(host().querySelectorAll('button, a, [role="tab"]')).toHaveLength(0);
      expect(host().textContent!.trim()).toBe('');
    });

    it('es una región «carrusel» con nombre y con foco de teclado', () => {
      expect(host().getAttribute('role')).toBe('region');
      expect(host().getAttribute('aria-roledescription')).toBe('carrusel');
      expect(host().getAttribute('aria-label')).toBe(LABEL);
      expect(host().getAttribute('tabindex')).toBe('0');
    });
  });

  describe('avance solo', () => {
    beforeEach(() => create());

    it('cambia de foto cada 3 s y, tras la última, vuelve a la primera', () => {
      expect(active()).toBe(0);

      wait(2999);
      expect(active()).toBe(0);
      wait(1);
      expect(active()).toBe(1);
      wait(3000);
      wait(3000);
      expect(active()).toBe(3);
      wait(3000);
      expect(active()).toBe(0);
    });

    it('el puntero encima lo pausa y, al salir, sigue avanzando', () => {
      pointer('pointerenter');
      wait(10_000);
      expect(active()).toBe(0);

      pointer('pointerleave');
      wait(3000);
      expect(active()).toBe(1);
    });

    it('un clic da el foco pero no lo pausa por sí solo: el foco que no es del teclado no cuenta', () => {
      vi.spyOn(host(), 'matches').mockReturnValue(false);
      focus('focusin');
      wait(3000);

      expect(active()).toBe(1);
    });

    it('el dedo no lo pausa', () => {
      pointer('pointerenter', { pointerType: 'touch' });
      wait(3000);

      expect(active()).toBe(1);
    });

    it('el foco del teclado lo pausa y, al salir, sigue avanzando', () => {
      // jsdom no sabe si el foco llegó con el teclado
      vi.spyOn(host(), 'matches').mockReturnValue(true);
      focus('focusin');
      wait(10_000);
      expect(active()).toBe(0);

      focus('focusout');
      wait(3000);
      expect(active()).toBe(1);
    });

    it('cambiar de foto con las flechas lo detiene', () => {
      wait(2000);
      key('ArrowRight');
      settle();
      expect(active()).toBe(1);

      wait(30_000);
      expect(active()).toBe(1);
    });

    it('cambiar de foto arrastrando con el mouse no lo detiene: sigue 3 s después', () => {
      pointer('pointerdown', { clientX: 400 });
      pointer('pointerup', { clientX: 200 });
      wait(350);
      expect(active()).toBe(1);

      wait(3000);
      expect(active()).toBe(2);
    });

    it('cambiar de foto deslizando con el dedo lo detiene', () => {
      pointer('pointerdown', { clientX: 400, pointerType: 'touch' });
      pointer('pointerup', { clientX: 200, pointerType: 'touch' });
      wait(350);
      expect(active()).toBe(1);

      wait(30_000);
      expect(active()).toBe(1);
    });

    it('mientras se arrastra no avanza solo', () => {
      pointer('pointerdown', { clientX: 400, pointerType: 'touch' });
      wait(10_000);
      expect(active()).toBe(0);

      pointer('pointerup', { clientX: 380, pointerType: 'touch' });
      wait(350);
      wait(3000);
      expect(active()).toBe(1);
    });

    it('un arrastre de menos de 80 px no cambia de foto', () => {
      pointer('pointerdown', { clientX: 400 });
      pointer('pointerup', { clientX: 321 });
      wait(350);

      expect(active()).toBe(0);
    });

    it('un toque sin arrastrar no lo detiene', () => {
      pointer('pointerdown', { clientX: 200, pointerType: 'touch' });
      pointer('pointerup', { clientX: 205, pointerType: 'touch' });
      wait(350);
      wait(3000);

      expect(active()).toBe(1);
    });
  });

  it('con movimiento reducido no avanza sola', () => {
    create(true);

    wait(30_000);

    expect(active()).toBe(0);
  });

  describe('teclado', () => {
    beforeEach(() => create());

    it('las flechas cambian de foto en los dos sentidos y dan la vuelta', () => {
      key('ArrowLeft');
      settle();
      expect(active()).toBe(3);

      key('ArrowRight');
      settle();
      expect(active()).toBe(0);
      key('ArrowRight');
      settle();
      expect(active()).toBe(1);
    });

    it('cancela lo que haría el navegador con la flecha', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      });

      host().dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('arrastrar', () => {
    beforeEach(() => create());

    it('hacia la izquierda trae la siguiente y hacia la derecha, la anterior', () => {
      pointer('pointerdown', { clientX: 400 });
      pointer('pointerup', { clientX: 200 });
      wait(350);
      expect(active()).toBe(1);

      pointer('pointerdown', { clientX: 200 });
      pointer('pointerup', { clientX: 400 });
      wait(350);
      expect(active()).toBe(0);
    });

    it('hacia la derecha desde la primera da la vuelta a la última', () => {
      pointer('pointerdown', { clientX: 100 });
      pointer('pointerup', { clientX: 300 });
      wait(350);

      expect(active()).toBe(3);
    });

    it('un arrastre corto no cambia de foto', () => {
      pointer('pointerdown', { clientX: 100 });
      pointer('pointerup', { clientX: 120 });
      wait(350);

      expect(active()).toBe(0);
    });

    it('mientras se arrastra, las fotos siguen al puntero y al soltar terminan de entrar', () => {
      pointer('pointerdown', { clientX: 400 });
      pointer('pointermove', { clientX: 330 });
      expect(host().style.getPropertyValue('--drag')).toBe('-70px');

      pointer('pointerup', { clientX: 300 });
      expect(host().classList.contains('settling')).toBe(true);
      expect(host().style.getPropertyValue('--drag')).toBe('-100%');
      expect(active()).toBe(0);

      wait(350);
      expect(active()).toBe(1);
      expect(host().classList.contains('settling')).toBe(false);
      expect(host().style.getPropertyValue('--drag')).toBe('0px');
    });

    it('un arrastre corto vuelve la foto a su lugar', () => {
      pointer('pointerdown', { clientX: 400 });
      pointer('pointermove', { clientX: 380 });
      pointer('pointerup', { clientX: 380 });
      expect(host().style.getPropertyValue('--drag')).toBe('0%');

      wait(350);
      expect(active()).toBe(0);
    });

    it('las vecinas quedan marcadas para asomar a los lados', () => {
      expect(slides()[3].classList.contains('previous')).toBe(true);
      expect(slides()[1].classList.contains('next')).toBe(true);
    });

    it('el cursor es grabbing mientras se arrastra y grab al soltar', () => {
      pointer('pointerdown', { clientX: 100 });
      settle();
      expect(host().classList.contains('dragging')).toBe(true);

      pointer('pointerup', { clientX: 100 });
      wait(350);
      expect(host().classList.contains('dragging')).toBe(false);
    });

    it('un arrastre cancelado no cambia de foto', () => {
      pointer('pointerdown', { clientX: 400 });
      pointer('pointercancel');
      pointer('pointerup', { clientX: 100 });
      wait(350);

      expect(active()).toBe(0);
      expect(host().classList.contains('dragging')).toBe(false);
    });

    it('soltar sin haber agarrado la foto no hace nada', () => {
      pointer('pointerup', { clientX: 100 });
      wait(350);

      expect(active()).toBe(0);
    });

    it('no deja arrastrar la imagen ni seleccionarla', () => {
      const event = new Event('dragstart', { bubbles: true, cancelable: true });

      slides()[0].dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(slides().every((slide) => slide.getAttribute('draggable') === 'false')).toBe(true);
    });
  });
});

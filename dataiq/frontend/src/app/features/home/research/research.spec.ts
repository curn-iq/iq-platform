import { TestBed } from '@angular/core/testing';
import { HomeResearch } from './research';

describe('HomeResearch', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function mount() {
    const fixture = TestBed.createComponent(HomeResearch);
    await fixture.whenStable();
    return fixture;
  }

  it('es la sección «investigacion», a la que enlazan la barra y el pie', async () => {
    const root = (await mount()).nativeElement as HTMLElement;
    const section = root.querySelector('section')!;

    expect(section.id).toBe('investigacion');
    expect(section.getAttribute('aria-labelledby')).toBe('research-title');
    expect(root.querySelector('h2')!.textContent).toBe(
      'Con respuesta inmediata, se aprende antes.',
    );
  });

  it('lleva las tres conclusiones de la investigación', async () => {
    const root = (await mount()).nativeElement as HTMLElement;

    expect(
      Array.from(root.querySelectorAll('.conclusions li b')).map((b) => b.textContent),
    ).toEqual(['La respuesta inmediata', 'Un sistema automático', 'Repasar con juego']);
  });

  it('no enlaza a ninguna página de la investigación: no existe en el MVP', async () => {
    const root = (await mount()).nativeElement as HTMLElement;

    expect(root.querySelector('a')).toBeNull();
  });

  it('la animación se anuncia con una descripción y su dibujo es decorativo', async () => {
    const root = (await mount()).nativeElement as HTMLElement;

    expect(root.querySelector('figure')!.getAttribute('aria-label')).toContain(
      'un pulso de luz sube en espiral',
    );
    expect(root.querySelector('figure > svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.achievements-list')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('antes de verse (y con movimiento reducido) está completa y quieta', async () => {
    const root = (await mount()).nativeElement as HTMLElement;

    expect(root.querySelector('figure')!.classList.contains('complete')).toBe(true);
    expect(root.querySelector('figure')!.classList.contains('fading')).toBe(false);
    expect(root.querySelectorAll('.achievement.visible').length).toBe(4);
    expect(root.querySelectorAll('.station.lit').length).toBe(9);
    expect(root.querySelectorAll('.level.flash').length).toBe(3);
  });

  it('los cuatro logros, en la espiral y en la lista de celular', async () => {
    const root = (await mount()).nativeElement as HTMLElement;
    const texts = [
      'Instrumental reconocido',
      'Posiciones memorizadas',
      'Mesa completa, sin errores',
      'Un paso adelante',
    ];

    expect(
      Array.from(root.querySelectorAll('.achievement text')).map((t) => t.textContent),
    ).toEqual(texts);
    expect(
      Array.from(root.querySelectorAll('.achievements-list li')).map((li) =>
        li.textContent!.trim(),
      ),
    ).toEqual(texts);
    expect(root.querySelectorAll('.achievement.final').length).toBe(1);
  });

  it('en celular recorta el lienzo a la espiral', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('max-width'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const root = (await mount()).nativeElement as HTMLElement;

    expect(root.querySelector('figure > svg')!.getAttribute('viewBox')).toBe('110 40 500 540');
  });

  describe('la animación', () => {
    type Observe = (entries: Partial<IntersectionObserverEntry>[]) => void;
    let notify: Observe | undefined;
    let disconnect: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      notify = undefined;
      disconnect = vi.fn();
      // Los cuadros corren con el reloj falso; la programación de Angular sigue con el real
      vi.useFakeTimers({
        toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
      });
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(callback: Observe) {
            notify = callback;
          }
          observe = vi.fn();
          disconnect = disconnect;
        },
      );
    });

    afterEach(() => vi.useRealTimers());

    const achieved = (root: HTMLElement) => root.querySelectorAll('.achievement.visible').length;

    async function advance(fixture: { detectChanges(): void }, ms: number): Promise<void> {
      await vi.advanceTimersByTimeAsync(ms);
      fixture.detectChanges();
    }

    it('no corre hasta que se ve: sigue en su dibujo completo', async () => {
      const fixture = await mount();
      await advance(fixture, 3000);

      expect(achieved(fixture.nativeElement)).toBe(4);
    });

    it('al verse empieza desde cero y avanza cuadro a cuadro', async () => {
      const fixture = await mount();
      const root = fixture.nativeElement as HTMLElement;
      notify!([{ isIntersecting: true }]);
      await advance(fixture, 100);

      // Al empezar todavía no hay luz ni logros
      expect(achieved(root)).toBe(0);
      expect(root.querySelectorAll('.station.lit').length).toBe(0);

      await advance(fixture, 1000);
      expect(root.querySelectorAll('.station.lit').length).toBeGreaterThan(0);

      await advance(fixture, 5000);
      expect(achieved(root)).toBe(4);
      expect(root.querySelector('figure')!.classList.contains('fading')).toBe(false);
    });

    it('al final del ciclo se apaga y vuelve a empezar', async () => {
      const fixture = await mount();
      const root = fixture.nativeElement as HTMLElement;
      notify!([{ isIntersecting: true }]);
      await advance(fixture, 8700);
      expect(root.querySelector('figure')!.classList.contains('fading')).toBe(true);

      await advance(fixture, 600);
      expect(root.querySelector('figure')!.classList.contains('fading')).toBe(false);
      expect(achieved(root)).toBeLessThan(4);
    });

    it('al dejar de verse se detiene', async () => {
      const fixture = await mount();
      const root = fixture.nativeElement as HTMLElement;
      notify!([{ isIntersecting: true }]);
      await advance(fixture, 1500);
      notify!([{ isIntersecting: false }]);
      await advance(fixture, 0);
      const before = root.querySelectorAll('.station.lit').length;

      await advance(fixture, 4000);
      expect(root.querySelectorAll('.station.lit').length).toBe(before);
    });

    it('al destruirse suelta el observador', async () => {
      const fixture = await mount();
      fixture.destroy();

      expect(disconnect).toHaveBeenCalled();
    });

    it('con movimiento reducido no observa nada y se queda quieta', async () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }));
      const fixture = await mount();
      await advance(fixture, 3000);

      expect(notify).toBeUndefined();
      expect(achieved(fixture.nativeElement)).toBe(4);
    });
  });
});

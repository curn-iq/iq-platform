import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import { HomeCatalog } from '../home-catalog';
import { HomeProducts } from './products';

describe('HomeProducts', () => {
  let fixture: ComponentFixture<HomeProducts>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const rail = () => root().querySelector<HTMLElement>('.rail')!;
  const section = () => root().querySelector<HTMLElement>('section')!;

  async function mount(
    options: { desktop?: boolean; reduced?: boolean } = {},
    catalog?: { techniques: unknown[]; specialties: unknown[] },
  ): Promise<void> {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width') ? !!options.desktop : !!options.reduced,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([]), HomeCatalog],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomeProducts);
    fixture.detectChanges();
    await respond(catalog);
  }

  /** Responde a la lista de técnicas y a la de especialidades de la ventana de DataIQ. */
  async function respond(
    catalog: { techniques: unknown[]; specialties: unknown[] } = {
      techniques: [],
      specialties: [],
    },
  ): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/techniques`).flush(catalog.techniques);
    http.expectOne(`${TEST_API_BASE}/specialties`).flush(catalog.specialties);
    await Promise.resolve();
    await fixture.whenStable();
  }

  afterEach(() => {
    http?.match(() => true);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('lleva el titular y las tres herramientas, cada una con su lema y sus tres capacidades', async () => {
    await mount();

    expect(root().querySelector('h2')!.textContent).toBe('Tres formas derecorrer una técnica.');
    expect(Array.from(root().querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'DataIQ',
      'SIMIQ3D',
      'SIVRI',
    ]);
    expect(root().querySelectorAll('.tagline')[1].textContent).toBe(
      'La mesa en 3D, a una pregunta de distancia.',
    );
    for (const list of Array.from(root().querySelectorAll('.capabilities'))) {
      expect(list.querySelectorAll('li').length).toBe(3);
    }
  });

  it('es la sección «camino», a la que enlazan la barra y el pie', async () => {
    await mount();

    expect(section().id).toBe('camino');
    expect(section().getAttribute('aria-labelledby')).toBe('products-title');
    expect(root().querySelector('#products-title')).not.toBeNull();
  });

  it('«Conocer…» lleva a cada herramienta: DataIQ por el router, las otras con navegación completa', async () => {
    await mount();
    const links = Array.from(root().querySelectorAll<HTMLAnchorElement>('.info a'));

    expect(links.map((a) => [a.textContent!.trim(), a.getAttribute('href')])).toEqual([
      ['Conocer DataIQ', '/tecnicas'],
      ['Conocer SIMIQ3D', '/simiq3d/'],
      ['Conocer SIVRI', '/sivri/'],
    ]);
  });

  it('cada herramienta lleva su ventana de demostración', async () => {
    await mount();

    expect(root().querySelector('app-dataiq-window')).not.toBeNull();
    expect(root().querySelector('app-simiq3d-window')).not.toBeNull();
    expect(root().querySelector('app-sivri-window')).not.toBeNull();
    for (const window of Array.from(root().querySelectorAll('.visual > *'))) {
      expect(window.getAttribute('aria-hidden')).toBe('true');
      expect(window.querySelector('.demo')!.textContent).toBe('demostración');
    }
  });

  it('la ventana de DataIQ lista técnicas reales del catálogo, por especialidad', async () => {
    await mount(
      {},
      {
        techniques: [
          { id: 't-1', name: 'Mastectomía', specialty: 'Cirugía general', version_number: 1 },
          { id: 't-2', name: 'Cesárea', specialty: 'Ginecología', version_number: 1 },
        ],
        specialties: [
          { id: 'e-1', name: 'Cirugía general' },
          { id: 'e-2', name: 'Ginecología' },
        ],
      },
    );

    const list = root().querySelector('app-dataiq-window .list')!;
    expect(Array.from(list.children).map((c) => c.textContent)).toEqual([
      'Cirugía general',
      'Mastectomía',
      'Ginecología',
      'Cesárea',
    ]);
  });

  describe('sin traslado por scroll (celular o movimiento reducido)', () => {
    it('en celular el carril se desplaza con el dedo: sin altura ni traslado', async () => {
      await mount({ desktop: false });

      expect(section().classList.contains('native')).toBe(true);
      expect(section().style.height).toBe('');
      expect(rail().style.transform).toBe('');
    });

    it('con movimiento reducido en escritorio también', async () => {
      await mount({ desktop: true, reduced: true });

      expect(section().classList.contains('native')).toBe(true);
      expect(rail().style.transform).toBe('');
    });
  });

  describe('en escritorio', () => {
    let top = 0;

    beforeEach(() => {
      vi.stubGlobal('innerHeight', 800);
      vi.stubGlobal('innerWidth', 1200);
      // El carril mide 2200 px de ancho: sobresalen 1000 de la ventana
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.classList.contains('rail') ? 2200 : 0;
      });
      top = 0;
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
        () => ({ top }) as DOMRect,
      );
    });

    /** Mueve la sección y espera al cuadro en que el carril reacciona al scroll. */
    async function scrollTo(sectionTop: number): Promise<void> {
      top = sectionTop;
      window.dispatchEvent(new Event('scroll'));
      await new Promise((resolve) => setTimeout(resolve, 50));
      await fixture.whenStable();
    }

    /** Lo que se traslada el carril a la izquierda; jsdom normaliza los ceros del `translate3d`. */
    const offset = () => 0 - parseFloat(rail().style.transform.slice('translate3d('.length));

    it('la sección mide el alto de la ventana más lo que sobresale el carril', async () => {
      await mount({ desktop: true });

      expect(section().classList.contains('native')).toBe(false);
      expect(section().style.height).toBe('1800px');
    });

    it('al principio el carril está en su sitio y la primera herramienta es la actual', async () => {
      await mount({ desktop: true });

      expect(offset()).toBe(0);
      const steps = Array.from(root().querySelectorAll('.steps div'));
      expect(steps.map((s) => s.classList.contains('current'))).toEqual([true, false, false]);
    });

    it('con el scroll, el carril se traslada y los trazos se llenan de a una herramienta', async () => {
      await mount({ desktop: true });
      await scrollTo(-500);

      expect(offset()).toBe(500);
      const steps = Array.from(root().querySelectorAll<HTMLElement>('.steps div'));
      expect(steps.map((s) => s.classList.contains('current'))).toEqual([false, true, false]);
      expect(steps.map((s) => Number(s.querySelector('i')!.style.getPropertyValue('--p')))).toEqual(
        [1, 0.5, 0],
      );
    });

    it('al terminar el recorrido la última herramienta queda completa', async () => {
      await mount({ desktop: true });
      await scrollTo(-1000);

      expect(offset()).toBe(1000);
      const steps = Array.from(root().querySelectorAll('.steps div'));
      expect(steps.map((s) => s.classList.contains('current'))).toEqual([false, false, true]);
    });

    it('antes de llegar a la sección no se traslada', async () => {
      await mount({ desktop: true });
      await scrollTo(400);

      expect(offset()).toBe(0);
    });

    it('al destruirse deja de escuchar el scroll', async () => {
      await mount({ desktop: true });
      const remove = vi.spyOn(window, 'removeEventListener');
      fixture.destroy();

      expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});

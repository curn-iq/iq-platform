import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { Catalog } from './catalog';

const SPECIALTIES = [
  { id: 'e-1', name: 'Cirugía general' },
  { id: 'e-2', name: 'Urología' },
  { id: 'e-3', name: 'Ortopedia' },
];

const TECHNIQUES = [
  { id: 't-1', name: 'Mastectomía', specialty: 'Cirugía general', version_number: 1 },
  { id: 't-2', name: 'Tiroidectomía', specialty: 'Cirugía general', version_number: 1 },
  { id: 't-3', name: 'Prostatectomía', specialty: 'Urología', version_number: 2 },
];

describe('Catalog', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;
  let root: HTMLElement;

  const filterButtons = () =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('.filter button'));
  const pressed = () =>
    filterButtons()
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent!.trim());
  const groups = () =>
    Array.from(root.querySelectorAll('.group')).map((group) => [
      group.querySelector('h2')!.textContent,
      Array.from(group.querySelectorAll('.technique')).map((link) => link.textContent!.trim()),
    ]);
  const input = () => root.querySelector<HTMLInputElement>('input')!;

  async function open(
    url = '/tecnicas',
    data: { techniques?: unknown[]; specialties?: unknown[] } = {},
  ): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([{ path: 'tecnicas', component: Catalog }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    root = harness.routeNativeElement as HTMLElement;
    await respond(data.techniques ?? TECHNIQUES, data.specialties ?? SPECIALTIES);
  }

  async function respond(techniques: unknown[], specialties: unknown[]): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/techniques`).flush(techniques);
    http.expectOne(`${TEST_API_BASE}/specialties`).flush(specialties);
    await Promise.resolve();
    await harness.fixture.whenStable();
  }

  async function type(text: string): Promise<void> {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
  }

  async function choose(name: string): Promise<void> {
    filterButtons()
      .find((b) => b.textContent!.trim() === name)!
      .click();
    await harness.fixture.whenStable();
  }

  /** jsdom no trae `animate`: se define para la prueba y se quita al terminar. */
  function stubAnimate(animate: unknown): void {
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: animate,
    });
  }

  afterEach(() => {
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
    http?.match(() => true);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('lleva el titular «Técnicas» con su línea de apoyo y el buscador', async () => {
    await open();

    expect(root.querySelector('h1')!.textContent).toBe('Técnicas');
    expect(root.querySelector('.text')!.textContent).toBe(
      'Cada técnica, con su instrumental y su mesa.',
    );
    expect(root.querySelector('[role=search]')).not.toBeNull();
    expect(input().placeholder).toBe('Buscar técnica o especialidad');
  });

  it('dice «Cargando…» mientras llegan las técnicas, y no «no hay técnicas»', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([{ path: 'tecnicas', component: Catalog }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/tecnicas');
    root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('.loading')!.textContent).toBe('Cargando…');
    expect(root.querySelector('.empty')).toBeNull();
  });

  it('si la API falla no queda «Cargando…» ni un falso «no hay técnicas»', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([{ path: 'tecnicas', component: Catalog }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/tecnicas');
    root = harness.routeNativeElement as HTMLElement;
    http
      .expectOne(`${TEST_API_BASE}/techniques`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne(`${TEST_API_BASE}/specialties`).flush(SPECIALTIES);
    await Promise.resolve();
    await harness.fixture.whenStable();

    expect(root.querySelector('.loading')).toBeNull();
    expect(root.querySelector('.empty')).toBeNull();
  });

  describe('lista', () => {
    it('agrupa las técnicas por especialidad, en el orden de la API', async () => {
      await open();

      expect(groups()).toEqual([
        ['Cirugía general', ['Mastectomía', 'Tiroidectomía']],
        ['Urología', ['Prostatectomía']],
      ]);
    });

    it('cada técnica lleva a su detalle por su id', async () => {
      await open();
      const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.technique'));

      expect(links.map((a) => a.getAttribute('href'))).toEqual([
        '/tecnicas/t-1',
        '/tecnicas/t-2',
        '/tecnicas/t-3',
      ]);
    });

    it('no muestra cifras del catálogo', async () => {
      await open();

      expect(root.textContent).not.toMatch(/\b\d+ técnicas?\b/i);
    });
  });

  describe('filtro por especialidad', () => {
    it('ofrece «Todas» y cada especialidad de la API, con «Todas» elegida', async () => {
      await open();

      expect(filterButtons().map((b) => b.textContent!.trim())).toEqual([
        'Todas',
        'Cirugía general',
        'Urología',
        'Ortopedia',
      ]);
      expect(pressed()).toEqual(['Todas']);
      expect(root.querySelector('nav')!.getAttribute('aria-label')).toBe('Especialidad');
    });

    it('elegir una especialidad deja solo sus técnicas y la marca', async () => {
      await open();
      await choose('Urología');

      expect(pressed()).toEqual(['Urología']);
      expect(groups()).toEqual([['Urología', ['Prostatectomía']]]);
    });

    it('lo elegido queda en la URL sin sumar entradas al historial, y «Todas» la limpia', async () => {
      await open();
      await choose('Urología');
      expect(router.url).toBe('/tecnicas?especialidad=e-2');

      await choose('Todas');
      expect(router.url).toBe('/tecnicas');
      expect(groups().length).toBe(2);
    });

    it('llega filtrado desde la barra o el pie: ?especialidad=<id>', async () => {
      await open('/tecnicas?especialidad=e-1');

      expect(pressed()).toEqual(['Cirugía general']);
      expect(groups()).toEqual([['Cirugía general', ['Mastectomía', 'Tiroidectomía']]]);
    });

    it('sigue a la URL cuando cambia, p. ej. al elegir otra especialidad en la barra', async () => {
      await open('/tecnicas?especialidad=e-1');
      await router.navigateByUrl('/tecnicas?especialidad=e-2');
      await harness.fixture.whenStable();

      expect(pressed()).toEqual(['Urología']);
    });

    it('un id que no existe es como no haber elegido', async () => {
      await open('/tecnicas?especialidad=nada');

      expect(pressed()).toEqual(['Todas']);
      expect(groups().length).toBe(2);
    });

    it('una especialidad sin técnicas dice que no hay, no «Cargando…»', async () => {
      await open();
      await choose('Ortopedia');

      expect(root.querySelector('.empty h2')!.textContent).toBe(
        'No hay técnicas en esta especialidad.',
      );
    });

    it('la placa se coloca tras la especialidad elegida', async () => {
      vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return Array.from(this.parentElement?.children ?? []).indexOf(this) * 48;
      });
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(46);
      await open();
      const plate = () => root.querySelector<HTMLElement>('.plate')!;
      expect(plate().style.transform).toBe('translateY(0px)');

      await choose('Urología');
      expect(plate().style.transform).toBe('translateY(96px)');
      expect(plate().style.height).toBe('46px');
    });
  });

  describe('buscador', () => {
    it('filtra por nombre sin importar tildes ni mayúsculas', async () => {
      await open();
      await type('TIROIDECTOMIA');

      expect(groups()).toEqual([['Cirugía general', ['Tiroidectomía']]]);
    });

    it('resalta lo que coincide', async () => {
      await open();
      await type('tomia');

      const marks = Array.from(root.querySelectorAll('mark')).map((m) => m.textContent);
      expect(marks).toEqual(['tomía', 'tomía', 'tomía']);
      expect(root.querySelector('.technique')!.textContent!.trim()).toBe('Mastectomía');
    });

    it('buscar una especialidad trae todas sus técnicas', async () => {
      await open();
      await type('cirugia');

      expect(groups()).toEqual([['Cirugía general', ['Mastectomía', 'Tiroidectomía']]]);
      expect(root.querySelector('mark')).toBeNull();
    });

    it('se acota a la especialidad elegida', async () => {
      await open();
      await choose('Urología');
      await type('mastectomia');

      expect(groups()).toEqual([]);
      expect(root.querySelector('.empty')).not.toBeNull();
    });

    it('sin coincidencias nombra la búsqueda y ofrece «Ver todas las técnicas»', async () => {
      await open();
      await type('  zzz ');

      expect(root.querySelector('.empty h2')!.textContent).toBe(
        'Ninguna técnica coincide con «zzz».',
      );
      expect(root.querySelector('.empty p')!.textContent).toBe(
        'Probar con otra palabra o revisar la especialidad elegida.',
      );
      expect(root.querySelector('.empty button')!.textContent!.trim()).toBe(
        'Ver todas las técnicas',
      );
    });

    it('«Ver todas las técnicas» borra la búsqueda y la especialidad', async () => {
      await open();
      await choose('Urología');
      await type('zzz');

      root.querySelector<HTMLButtonElement>('.empty button')!.click();
      await harness.fixture.whenStable();

      expect(input().value).toBe('');
      expect(pressed()).toEqual(['Todas']);
      expect(groups().length).toBe(2);
      expect(router.url).toBe('/tecnicas');
    });

    it('el botón de borrar del campo trae todo de vuelta', async () => {
      await open();
      await type('mastectomia');
      root.querySelector<HTMLButtonElement>('.clear')!.click();
      await harness.fixture.whenStable();

      expect(groups().length).toBe(2);
    });
  });

  describe('al cambiar la lista', () => {
    it('las filas que entran suben con un fundido', async () => {
      const animate = vi.fn();
      stubAnimate(animate);
      await open();
      await choose('Urología');
      animate.mockClear();

      await choose('Todas');

      // Las dos técnicas de Cirugía general vuelven a entrar
      expect(animate).toHaveBeenCalledTimes(2);
      expect(animate.mock.calls[0][0][0]).toEqual({ opacity: 0, transform: 'translateY(10px)' });
    });

    it('con movimiento reducido no se anima nada', async () => {
      const animate = vi.fn();
      stubAnimate(animate);
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }));
      await open();
      await choose('Urología');
      await choose('Todas');

      expect(animate).not.toHaveBeenCalled();
    });
  });
});

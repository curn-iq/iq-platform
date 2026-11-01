import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import { TechniqueColumn } from './technique-column';

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

describe('TechniqueColumn', () => {
  let http: HttpTestingController;
  let root: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<TechniqueColumn>>;

  const links = () => Array.from(root.querySelectorAll<HTMLAnchorElement>('li a'));
  const names = () => links().map((a) => a.textContent!.trim());
  const input = () => root.querySelector<HTMLInputElement>('input')!;
  const toggle = () => root.querySelector<HTMLButtonElement>('.toggle')!;

  async function mount(currentId: string | null = 't-2', tab = 'datos-clinicos') {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([{ path: '**', children: [] }])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TechniqueColumn);
    fixture.componentRef.setInput('currentId', currentId ?? undefined);
    fixture.componentRef.setInput('tab', tab);
    root = fixture.nativeElement;
    // Sin `whenStable`: con las peticiones pendientes no termina
    fixture.detectChanges();
  }

  async function respond(): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/techniques`).flush(TECHNIQUES);
    http.expectOne(`${TEST_API_BASE}/specialties`).flush(SPECIALTIES);
    await Promise.resolve();
    await fixture.whenStable();
  }

  async function type(text: string): Promise<void> {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  afterEach(() => http?.match(() => true));

  it('agrupa las técnicas por especialidad, en el orden de la API', async () => {
    await mount();
    await respond();

    expect(Array.from(root.querySelectorAll('h2')).map((h) => h.textContent)).toEqual([
      'Cirugía general',
      'Urología',
    ]);
    expect(names()).toEqual(['Mastectomía', 'Tiroidectomía', 'Prostatectomía']);
  });

  it('cada técnica lleva a su detalle, en la pestaña abierta', async () => {
    await mount('t-2', 'mesa-de-mayo');
    await respond();

    expect(links().map((a) => a.getAttribute('href'))).toEqual([
      '/tecnicas/t-1/mesa-de-mayo',
      '/tecnicas/t-2/mesa-de-mayo',
      '/tecnicas/t-3/mesa-de-mayo',
    ]);
  });

  it('marca solo la técnica abierta', async () => {
    await mount('t-2');
    await respond();

    const current = links().filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current.map((a) => a.textContent!.trim())).toEqual(['Tiroidectomía']);
  });

  it('sin técnica abierta no marca ninguna', async () => {
    await mount(null);
    await respond();

    expect(root.querySelector('[aria-current]')).toBeNull();
  });

  describe('buscador', () => {
    it('filtra sin importar tildes ni mayúsculas y quita los grupos vacíos', async () => {
      await mount();
      await respond();
      await type('TIROIDECTOMIA');

      expect(names()).toEqual(['Tiroidectomía']);
      expect(root.querySelectorAll('h2')).toHaveLength(1);
    });

    it('una técnica que no coincide se oculta aunque sea la abierta', async () => {
      await mount('t-2');
      await respond();
      await type('prostat');

      expect(names()).toEqual(['Prostatectomía']);
    });

    it('sin coincidencias nombra la búsqueda', async () => {
      await mount();
      await respond();
      await type(' zzz ');

      expect(names()).toEqual([]);
      expect(root.querySelector('.empty')!.textContent).toBe('Ninguna técnica coincide con «zzz».');
    });

    it('es el compacto, con su etiqueta para quien no lo ve', async () => {
      await mount();
      await respond();

      expect(root.querySelector('[role=search]')).not.toBeNull();
      expect(root.querySelector('app-search-field')!.classList).toContain('compact');
      expect(root.querySelector('label')!.textContent).toBe('Buscar una técnica');
      expect(input().placeholder).toBe('Buscar técnica');
    });
  });

  describe('carga', () => {
    it('dice «Cargando…» mientras llegan las técnicas, y no «ninguna coincide»', async () => {
      await mount();

      expect(root.querySelector('.loading')!.textContent).toBe('Cargando…');
      expect(root.querySelector('.empty')).toBeNull();
    });

    it('si la API falla no queda «Cargando…» ni un falso «ninguna coincide»', async () => {
      await mount();
      http
        .expectOne(`${TEST_API_BASE}/techniques`)
        .flush(null, { status: 500, statusText: 'Server Error' });
      http.expectOne(`${TEST_API_BASE}/specialties`).flush(SPECIALTIES);
      await Promise.resolve();
      await fixture.whenStable();

      expect(root.querySelector('.loading')).toBeNull();
      expect(root.querySelector('.empty')).toBeNull();
    });
  });

  describe('selector de celular', () => {
    it('dice la especialidad y la técnica abierta', async () => {
      await mount('t-2');
      await respond();

      expect(toggle().textContent!.trim()).toBe('Cirugía general · Tiroidectomía');
    });

    it('mientras no se sabe cuál es, dice «Técnicas»', async () => {
      await mount('t-2');

      expect(toggle().textContent!.trim()).toBe('Técnicas');
    });

    it('se despliega y se pliega, y lo dice a los lectores de pantalla', async () => {
      await mount();
      await respond();
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(root.querySelector('nav')!.classList).not.toContain('open');

      toggle().click();
      await fixture.whenStable();
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
      expect(root.querySelector('nav')!.classList).toContain('open');
      expect(toggle().getAttribute('aria-controls')).toBe(
        root.querySelector('.body')!.getAttribute('id'),
      );

      toggle().click();
      await fixture.whenStable();
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
    });

    it('elegir una técnica lo pliega', async () => {
      await mount();
      await respond();
      toggle().click();
      await fixture.whenStable();

      links()[0].addEventListener('click', (event) => event.preventDefault());
      links()[0].click();
      await fixture.whenStable();

      expect(toggle().getAttribute('aria-expanded')).toBe('false');
    });
  });
});

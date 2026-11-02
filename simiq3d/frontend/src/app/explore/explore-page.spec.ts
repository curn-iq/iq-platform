import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideRepositoryTesting, TEST_DATAIQ, TEST_SIMIQ3D } from '../data/testing';
import { MOBILE_QUERY } from '../shared/media-query';
import { ExplorePage } from './explore-page';

const TECHNIQUES = [
  { id: 't-1', name: 'Mastectomía', specialty: 'Cirugía General', version_number: 1 },
  { id: 't-2', name: 'Tiroidectomía', specialty: 'Cirugía General', version_number: 1 },
  { id: 't-9', name: 'Cesárea', specialty: 'Ginecología y obstetricia', version_number: 1 },
];
const TABLES = {
  zones: [{ zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 2, columns: 3 }],
  items: [
    {
      id: 'kelly',
      zone_id: 'z-mayo',
      zone: 'Mesa de Mayo',
      legend_number: 4,
      source_text: 'Pinza Kelly',
      components: [{ instrument_id: 'i-kelly', suture_id: null, name: 'Pinza Kelly' }],
      cells: [{ row: 1, column: 2 }],
    },
  ],
  sutures: [],
  equipment: [],
  devices: [],
};

describe('ExplorePage', () => {
  beforeEach(() => {
    // Sin WebGL en las pruebas: el visor muestra su aviso y no descarga Three.js
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideRepositoryTesting()] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Abre la pantalla y responde cada petición con datos de prueba. */
  async function open(id?: string) {
    const fixture = TestBed.createComponent(ExplorePage);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    const responses: Record<string, unknown> = {
      [`${TEST_DATAIQ}/techniques`]: TECHNIQUES,
      [`${TEST_DATAIQ}/instruments`]: [
        { id: 'i-kelly', name: 'Pinza Kelly', description: 'Pinza hemostática curva.' },
      ],
      [`${TEST_SIMIQ3D}/models`]: [{ instrument_id: 'i-kelly', model_file: 'kelly_forceps.glb' }],
      [`${TEST_DATAIQ}/techniques/${id}/instruments`]: TABLES,
    };
    TestBed.inject(HttpTestingController)
      .match(() => true)
      .forEach((request) => request.flush(responses[request.request.url] ?? {}));
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('sin técnica, da la bienvenida con una opción por técnica de Cirugía General', async () => {
    const page = await open();
    expect(page.textContent).toContain('Elige una técnica para verla en 3D');
    const options = Array.from(page.querySelectorAll('app-chat-field .option'));
    expect(options.map((o) => o.textContent?.trim())).toEqual(['Mastectomía', 'Tiroidectomía']);
  });

  it('elegir una técnica abre su mesa', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const page = await open();
    page.querySelector<HTMLButtonElement>('app-chat-field .option')!.click();
    expect(navigate).toHaveBeenCalledWith(['/tecnicas', 't-1']);
  });

  it('con técnica, muestra su nombre, su mesa y la leyenda con el número del diagrama', async () => {
    const page = await open('t-1');
    expect(page.querySelector('app-canvas-head h1')?.textContent).toContain('Mastectomía');
    expect(page.querySelector('app-canvas-head .meta')?.textContent).toContain(
      'Mesa de Mayo · Cirugía General',
    );
    const piece = page.querySelector('app-legend .piece');
    expect(piece?.textContent).toContain('4');
    expect(piece?.textContent).toContain('Pinza Kelly');
  });

  it('señalar una pieza en la leyenda la marca, sin filas ni columnas', async () => {
    const page = await open('t-1');
    const piece = page.querySelector<HTMLButtonElement>('app-legend .piece')!;
    piece.click();
    TestBed.tick();
    expect(piece.getAttribute('aria-current')).toBe('true');
    expect(page.textContent).not.toMatch(/fila|columna/i);
  });

  it('en celular, la leyenda se pliega al elegir una pieza para que se vea en la mesa', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === MOBILE_QUERY,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const page = await open('t-1');
    page.querySelector<HTMLButtonElement>('app-legend .toggle')!.click();
    TestBed.tick();
    page.querySelector<HTMLButtonElement>('app-legend .piece')!.click();
    TestBed.tick();
    expect(page.querySelector('app-legend .panel')).toBeNull();

    page.querySelector<HTMLButtonElement>('app-legend .toggle')!.click();
    TestBed.tick();
    expect(page.querySelector('app-legend .piece')?.getAttribute('aria-current')).toBe('true');
  });

  it('la respuesta del chat señala el instrumento en su mesa y abre su ficha', async () => {
    const page = await open('t-1');
    const area = page.querySelector('textarea')!;
    area.value = '¿Qué es la Kelly?';
    area.dispatchEvent(new Event('input'));
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));

    const request = TestBed.inject(HttpTestingController).expectOne(`${TEST_SIMIQ3D}/chat`);
    expect(request.request.body).toEqual({ question: '¿Qué es la Kelly?', technique_id: 't-1' });
    request.flush({
      action: 'describe_instrument',
      technique_id: 't-1',
      instrument_id: 'i-kelly',
      field: null,
      reply: 'La Pinza Kelly es una pinza hemostática.',
      options: [],
    });
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();

    expect(page.querySelector('app-legend .piece')?.getAttribute('aria-current')).toBe('true');
    expect(page.querySelector('app-instrument-card')?.textContent).toContain(
      'Pinza hemostática curva.',
    );
    expect(page.querySelector('app-chat-history .chip')?.textContent).toContain(
      'Describir · Pinza Kelly',
    );
  });

  it('una técnica que SIMIQ3D no cubre lo dice y ofrece las que sí', async () => {
    const page = await open('t-9');
    expect(page.querySelector('.scope')?.textContent).toContain(
      'SIMIQ3D muestra por ahora la mesa de Mayo de las técnicas de Cirugía General',
    );
    expect(page.querySelectorAll('.scope .option')).toHaveLength(2);
  });
});

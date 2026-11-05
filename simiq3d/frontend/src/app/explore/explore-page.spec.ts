import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideRepositoryTesting, streamed, TEST_DATAIQ, TEST_SIMIQ3D } from '../data/testing';
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

  describe('el chat como panel inferior, en celular', () => {
    beforeEach(() => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === MOBILE_QUERY,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    });

    const dockOf = (page: HTMLElement) => page.querySelector<HTMLElement>('.dock')!;
    const grabOf = (page: HTMLElement) => page.querySelector<HTMLButtonElement>('.grab')!;
    // Actuar, esperar y comprobar (guía de `angular-developer`): con las señales, la
    // pantalla se actualiza sola cuando la aplicación está estable
    const press = async (page: HTMLElement, key: 'Enter' | ' ') => {
      grabOf(page).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await TestBed.inject(ApplicationRef).whenStable();
    };

    it('empieza asomado, con la conversación fuera de alcance', async () => {
      const page = await open('t-1');
      expect(dockOf(page).dataset['level']).toBe('peek');
      expect(page.querySelector('app-chat-history')?.hasAttribute('inert')).toBe(true);
      expect(grabOf(page).getAttribute('aria-label')).toBe('Subir el chat');
    });

    it('el asa sube el panel un paso y desde el completo lo baja', async () => {
      const page = await open('t-1');
      await press(page, 'Enter');
      expect(dockOf(page).dataset['level']).toBe('medium');
      expect(page.querySelector('app-chat-history')?.hasAttribute('inert')).toBe(false);
      await press(page, ' ');
      expect(dockOf(page).dataset['level']).toBe('full');
      expect(grabOf(page).getAttribute('aria-label')).toBe('Bajar el chat');
      await press(page, 'Enter');
      expect(dockOf(page).dataset['level']).toBe('peek');
    });

    it('cerrar la conversación vuelve al panel asomado', async () => {
      const page = await open('t-1');
      await press(page, 'Enter');
      page.querySelector<HTMLButtonElement>('app-chat-history .close')!.click();
      await TestBed.inject(ApplicationRef).whenStable();
      expect(dockOf(page).dataset['level']).toBe('peek');
    });
  });

  it('en escritorio el chat es un dock flotante sin asa y con ancho ajustable', async () => {
    const page = await open('t-1');
    expect(page.querySelector('.grab')).toBeNull();
    const divider = page.querySelector<HTMLElement>('.divider')!;
    expect(divider.getAttribute('aria-valuenow')).toBe('400');
    divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    await TestBed.inject(ApplicationRef).whenStable();
    expect(divider.getAttribute('aria-valuenow')).toBe('424');
    expect(page.querySelector<HTMLElement>('.bench')!.style.getPropertyValue('--panel')).toBe(
      '424px',
    );
  });

  it('la respuesta del chat señala el instrumento en su mesa y abre su ficha', async () => {
    const page = await open('t-1');
    const area = page.querySelector('textarea')!;
    area.value = '¿Qué es la Kelly?';
    area.dispatchEvent(new Event('input'));
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));

    const request = TestBed.inject(HttpTestingController).expectOne(`${TEST_SIMIQ3D}/chat/stream`);
    expect(request.request.body).toEqual({
      question: '¿Qué es la Kelly?',
      technique_id: 't-1',
      previous: [],
    });
    request.flush(
      streamed({
        action: 'describe_instrument',
        technique_id: 't-1',
        instrument_id: 'i-kelly',
        field: null,
        reply: 'La Pinza Kelly es una pinza hemostática.',
        options: [],
        requests: [{ kind: 'describe', instrument: 'Kelly' }],
        generated: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();

    expect(page.querySelector('app-legend .piece')?.getAttribute('aria-current')).toBe('true');
    expect(page.querySelector('app-instrument-card')?.textContent).toContain(
      'Pinza hemostática curva.',
    );
    expect(page.querySelector('app-chat-history .chip')).toBeNull();
  });

  it('una técnica que SIMIQ3D no cubre lo dice y ofrece las que sí', async () => {
    const page = await open('t-9');
    expect(page.querySelector('.scope')?.textContent).toContain(
      'SIMIQ3D muestra por ahora la mesa de Mayo de las técnicas de Cirugía General',
    );
    expect(page.querySelectorAll('.scope .option')).toHaveLength(2);
  });
});

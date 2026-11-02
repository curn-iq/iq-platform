import { HttpTestingController } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionService } from '../../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import { Review } from './review';

@Component({ template: '' })
class Blank {}

const PROPOSAL_ID = '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f';
const PUBLISHED_ID = '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e60';
const REVIEWER = { id: 'u-revisor', name: 'Laura Pérez', email: 'l@correo.com', role: 'reviewer' };

const PROPOSAL_URL = `${TEST_API_BASE}/versions/${PROPOSAL_ID}`;
const PUBLISHED_URL = `${TEST_API_BASE}/versions/${PUBLISHED_ID}`;
const LIST_URL = (r: { url: string }) => r.url === `${TEST_API_BASE}/versions`;

const MAYO = { zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 4, columns: 6 };
const RESERVE = { zone_id: 'z-reserva', zone: 'Mesa de reserva', used: true, rows: 3, columns: 5 };

function item(zoneId: string, number: number, name: string, row: number, column: number) {
  return {
    id: `i-${zoneId}-${number}`,
    zone_id: zoneId,
    zone: null,
    legend_number: number,
    source_text: name,
    components: [{ instrument_id: `ins-${name}`, suture_id: null, name }],
    cells: [{ row, column }],
  };
}

function content(overrides: object = {}) {
  return {
    id: 't-1',
    name: 'Tiroidectomía',
    specialty: 'Cirugía general',
    version_number: 1,
    cups_code: null,
    anesthesia: 'General',
    patient_position: null,
    drapes: null,
    description: null,
    indications: null,
    complications: null,
    surgical_technique: null,
    source: 'Documento de IQ.',
    zones: [MAYO, RESERVE],
    items: [item('z-mayo', 6, 'Separador de Senn Miller', 4, 4)],
    sutures: [],
    equipment: [],
    devices: [],
    ...overrides,
  };
}

function detail(
  id: string,
  number: number,
  state: string,
  body: object,
  createdBy = 'u-autor',
  updatedAt = '2026-10-01T09:00:00',
) {
  return {
    summary: {
      id,
      technique_id: 't-1',
      technique: 'Tiroidectomía',
      specialty: 'Cirugía general',
      number,
      state,
      created_by: createdBy,
      author: 'Daniela Ortiz',
      updated_at: updatedAt,
    },
    content: body,
    rejections: [],
  };
}

function summary(id: string, techniqueId: string) {
  return { ...detail(id, 1, 'published', content()).summary, technique_id: techniqueId };
}

describe('Review', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let root: HTMLElement;

  async function configure(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([
          { path: 'gestion/revision', component: Blank },
          { path: 'gestion/revision/:versionId', component: Review },
        ]),
        {
          provide: SessionService,
          useValue: { account: signal(REVIEWER), role: signal('reviewer') },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  }

  const text = (selector: string) =>
    root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const text2 = (parent: Element, selector: string) =>
    parent.querySelector(selector)?.textContent?.trim();
  /** Cada pestaña como «Nombre · cifra o nota»; la cifra se lee con su texto («2 cambios»). */
  const tabLabels = () =>
    Array.from(root.querySelectorAll('[role=tab]')).map((tab) => {
      const label = tab.firstChild!.textContent!.trim();
      const count = tab.querySelector('.count')?.textContent?.trim();
      const note = tab.querySelector('.note')?.textContent?.trim();
      const spoken = tab.querySelector('.sr-only')?.textContent?.trim();
      return [label, count && spoken ? count + ' (' + spoken + ')' : note].join(' · ');
    });

  async function settle(): Promise<void> {
    // Sin `whenStable`: una petición que la prueba aún no responde la mantiene inestable
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
      TestBed.tick();
      harness.detectChanges();
    }
  }

  async function visit(id = PROPOSAL_ID): Promise<void> {
    await harness.navigateByUrl(`/gestion/revision/${id}`);
    root = harness.routeNativeElement as HTMLElement;
  }

  /** Abre una edición: responde la propuesta, la lista de publicadas y la versión publicada. */
  async function openEdition(proposed: object = content(), published: object = content()) {
    await visit();
    http.expectOne(PROPOSAL_URL).flush(detail(PROPOSAL_ID, 2, 'in_review', proposed));
    await settle();
    http.expectOne(LIST_URL).flush([summary('otra', 't-9'), summary(PUBLISHED_ID, 't-1')]);
    await settle();
    http.expectOne(PUBLISHED_URL).flush(detail(PUBLISHED_ID, 1, 'published', published));
    await settle();
  }

  afterEach(() => http.verify());

  describe('mientras llega', () => {
    it('dice «Cargando…» y pide solo la propuesta', async () => {
      await configure();
      await visit();

      expect(text('.loading')).toBe('Cargando…');
      http.expectOne(PROPOSAL_URL).flush(detail(PROPOSAL_ID, 1, 'in_review', content()));
      await settle();
    });
  });

  describe('una edición de la publicada', () => {
    it('pide la propuesta y, de las publicadas, la de esa técnica', async () => {
      await configure();
      await visit();
      http.expectOne(PROPOSAL_URL).flush(detail(PROPOSAL_ID, 2, 'in_review', content()));
      await settle();

      const list = http.expectOne(LIST_URL);
      expect(list.request.params.getAll('state')).toEqual(['published']);
      list.flush([summary('otra', 't-9'), summary(PUBLISHED_ID, 't-1')]);
      await settle();
      http.expectOne(PUBLISHED_URL).flush(detail(PUBLISHED_ID, 1, 'published', content()));
      await settle();

      expect(text('h1')).toBe('Tiroidectomía');
    });

    it('la cabecera dice la versión, el tipo, quién la envió y cuándo', async () => {
      await configure();
      await openEdition();

      expect(text('.meta')).toBe(
        'Versión 2 · edición de la publicada · enviada por Daniela Ortiz el 1 oct',
      );
      expect(text('.route')).toBe('Por revisar');
      expect(root.querySelector('.route')!.getAttribute('href')).toBe('/gestion/revision');
    });

    it('las pestañas cuentan los cambios de cada sección y abre en la mesa de Mayo', async () => {
      await configure();
      await openEdition(
        content({
          description: 'Nuevo.',
          anesthesia: 'Regional',
          items: [item('z-mayo', 6, 'Separador de Senn Miller', 4, 3)],
        }),
      );

      expect(tabLabels()).toEqual([
        'Datos clínicos · 2 (2 cambios)',
        'Instrumental · sin cambios',
        'Mesa de Mayo · 1 (1 cambio)',
        'Mesa de reserva · sin cambios',
      ]);
      expect(root.querySelector('[role=tab][aria-selected=true]')!.id).toBe('tab-mayo');
      expect(root.querySelector('[role=tabpanel]')!.getAttribute('aria-labelledby')).toBe(
        'tab-mayo',
      );
    });

    it('la mesa de Mayo pone la publicada, la propuesta y el cambio con su número', async () => {
      await configure();
      await openEdition(content({ items: [item('z-mayo', 6, 'Separador de Senn Miller', 4, 3)] }));

      expect(root.querySelectorAll('app-table-diagram')).toHaveLength(2);
      expect(text('.side-head h3')).toBe('Publicada · versión 1');
      expect(text('.change .number')).toBe('6');
      expect(text('.change strong')).toBe('Separador de Senn Miller');
      expect(text('.change .detail')).toBe('Fila 4 · Columna 4 → Fila 4 · Columna 3');
    });

    it('elegir «Datos clínicos» muestra sus campos con lo cambiado marcado', async () => {
      await configure();
      await openEdition(content({ description: 'Extirpar la tiroides.', anesthesia: 'Regional' }));

      root.querySelector<HTMLButtonElement>('#tab-clinical')!.click();
      await settle();

      expect(root.querySelector('app-review-clinical')).not.toBeNull();
      expect(text('.field.changed .tag')).toBe('+ Agregado');
      expect(
        Array.from(root.querySelectorAll('.field.changed dt')).map((dt) => dt.textContent!.trim()),
      ).toEqual(['Para qué sirve', 'Anestesia']);
      expect(root.querySelector('[role=tabpanel]')!.id).toBe('panel-clinical');
    });

    it('elegir «Instrumental» muestra qué se agregó y qué se quitó', async () => {
      await configure();
      await openEdition(
        content({
          items: [item('z-mayo', 7, 'Tijera Mayo', 1, 1)],
        }),
      );

      root.querySelector<HTMLButtonElement>('#tab-instrumental')!.click();
      await settle();

      expect(
        Array.from(root.querySelectorAll('.changes li')).map(
          (li) => `${text2(li, '.kind')}: ${text2(li, 'strong')}`,
        ),
      ).toEqual(['Quitado: Separador de Senn Miller', 'Agregado: Tijera Mayo']);
    });

    it('«Mesa de reserva» sin cambios lo dice', async () => {
      await configure();
      await openEdition();

      root.querySelector<HTMLButtonElement>('#tab-reserve')!.click();
      await settle();

      expect(text('.unchanged')).toBe('Sin cambios frente a la versión publicada.');
    });

    it('el título de la pestaña del navegador nombra la técnica', async () => {
      await configure();
      await openEdition();

      expect(document.title).toBe('Revisar Tiroidectomía · IQ Platform');
    });
  });

  describe('una técnica nueva (versión 1)', () => {
    it('no pide las publicadas, lo dice y cuenta lo que hay en cada sección', async () => {
      await configure();
      await visit();
      http.expectOne(PROPOSAL_URL).flush(detail(PROPOSAL_ID, 1, 'in_review', content()));
      await settle();

      http.expectNone(LIST_URL);
      expect(text('.meta')).toContain('Versión 1 · técnica nueva ·');
      expect(tabLabels()).toEqual([
        'Datos clínicos · 2 campos',
        'Instrumental · 1 objeto',
        'Mesa de Mayo · 1 objeto',
        'Mesa de reserva · sin objetos',
      ]);
      expect(root.querySelectorAll('app-table-diagram')).toHaveLength(1);
    });
  });

  describe('una versión que no se revisa', () => {
    it('que ya no está en revisión lo dice y no pide la publicada', async () => {
      await configure();
      await visit();
      http.expectOne(PROPOSAL_URL).flush(detail(PROPOSAL_ID, 2, 'published', content()));
      await settle();

      http.expectNone(LIST_URL);
      expect(text('.notice p')).toBe('Esta versión ya no está en revisión.');
      expect(text('.notice a')).toBe('Volver a Por revisar');
      expect(root.querySelector('app-tabs')).toBeNull();
    });

    it('propia también: lo propio se publica desde el editor', async () => {
      await configure();
      await visit();
      http
        .expectOne(PROPOSAL_URL)
        .flush(detail(PROPOSAL_ID, 2, 'in_review', content(), REVIEWER.id));
      await settle();

      http.expectNone(LIST_URL);
      expect(text('.notice p')).toBe('Esta versión ya no está en revisión.');
    });
  });

  describe('si no existe o falla', () => {
    it('un id que no puede serlo es «No encontrada» y no se pide', async () => {
      await configure();
      await visit('abc');

      http.expectNone(PROPOSAL_URL);
      expect(root.querySelector('app-not-found')).not.toBeNull();
    });

    it('un 404 es «No encontrada»', async () => {
      await configure();
      await visit();
      http.expectOne(PROPOSAL_URL).flush(null, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(root.querySelector('app-not-found')).not.toBeNull();
    });

    it('si la API falla lo dice y «Reintentar» la pide de nuevo', async () => {
      await configure();
      await visit();
      http.expectOne(PROPOSAL_URL).flush('', { status: 500, statusText: 'Server Error' });
      await settle();

      expect(text('.notice p')).toBe('No se pudo cargar la versión.');

      root.querySelector<HTMLButtonElement>('.notice button')!.click();
      await settle();
      http.expectOne(PROPOSAL_URL).flush(detail(PROPOSAL_ID, 1, 'in_review', content()));
      await settle();

      expect(text('h1')).toBe('Tiroidectomía');
    });

    it('si falla la versión publicada también lo dice', async () => {
      await configure();
      await visit();
      http.expectOne(PROPOSAL_URL).flush(detail(PROPOSAL_ID, 2, 'in_review', content()));
      await settle();
      http.expectOne(LIST_URL).flush([summary(PUBLISHED_ID, 't-1')]);
      await settle();
      http.expectOne(PUBLISHED_URL).flush('', { status: 500, statusText: 'Server Error' });
      await settle();

      expect(text('.notice p')).toBe('No se pudo cargar la versión.');
      expect(root.querySelector('app-tabs')).toBeNull();
    });
  });
});

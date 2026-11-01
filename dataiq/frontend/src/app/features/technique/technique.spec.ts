import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionService } from '../../core/session/session.service';
import { provideTitle } from '../../core/title/title.providers';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { TechniqueDetail } from './technique';

const ID = '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f';
const OTHER_ID = '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e60';

const TECHNIQUE = {
  id: ID,
  name: 'Tiroidectomía',
  specialty: 'Cirugía general',
  version_number: 1,
  cups_code: null,
  anesthesia: null,
  patient_position: null,
  drapes: null,
  description: null,
  indications: null,
  complications: null,
  surgical_technique: null,
  source: null,
};

const LIST = [
  { id: ID, name: 'Tiroidectomía', specialty: 'Cirugía general', version_number: 1 },
  { id: OTHER_ID, name: 'Prostatectomía', specialty: 'Urología', version_number: 1 },
];
const SPECIALTIES = [
  { id: 'e-1', name: 'Cirugía general' },
  { id: 'e-2', name: 'Urología' },
];

describe('TechniqueDetail', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let root: HTMLElement;

  async function open(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideTitle(),
        provideRouter([
          { path: 'tecnicas/:id/:pestana', title: 'Técnica', component: TechniqueDetail },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    root = harness.routeNativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await Promise.resolve();
    await harness.fixture.whenStable();
  }

  /** Responde la técnica y las dos listas de la columna. */
  async function respond(technique: object = TECHNIQUE): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/techniques/${ID}`).flush(technique);
    answerColumn();
    await settle();
  }

  function answerColumn(): void {
    http.expectOne(`${TEST_API_BASE}/techniques`).flush(LIST);
    http.expectOne(`${TEST_API_BASE}/specialties`).flush(SPECIALTIES);
  }

  afterEach(() => {
    http?.match(() => true);
  });

  describe('con una técnica', () => {
    beforeEach(async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
    });

    it('mientras llega no dice nada falso: barras en lugar del nombre', async () => {
      expect(root.querySelector('.bone')).not.toBeNull();
      expect(root.querySelector('article')!.getAttribute('aria-busy')).toBe('true');
      expect(root.querySelector('app-not-found')).toBeNull();
    });

    it('lleva el nombre como titular y debajo la especialidad', async () => {
      await respond();

      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('h1')!.textContent).toBe('Tiroidectomía');
      expect(root.querySelector('header p')!.textContent).toBe('Cirugía general');
      expect(root.querySelector('.bone')).toBeNull();
      expect(root.querySelector('article')!.getAttribute('aria-busy')).toBe('false');
    });

    it('junto a la columna de técnicas, con la abierta marcada', async () => {
      await respond();

      const current = root.querySelector('app-technique-column [aria-current=page]');
      expect(current!.textContent!.trim()).toBe('Tiroidectomía');
    });

    it('tiene las cuatro pestañas y la hoja de la abierta', async () => {
      await respond();

      expect(root.querySelectorAll('[role=tab]')).toHaveLength(4);
      const sheet = root.querySelector('[role=tabpanel]')!;
      expect(sheet.id).toBe('panel-datos-clinicos');
      expect(sheet.getAttribute('aria-labelledby')).toBe('tab-datos-clinicos');
      expect(root.querySelector('#tab-datos-clinicos')!.getAttribute('aria-selected')).toBe('true');
    });

    it('la columna conserva la pestaña al elegir otra técnica', async () => {
      await respond();

      const links = Array.from(root.querySelectorAll('app-technique-column li a')).map((a) =>
        a.getAttribute('href'),
      );
      expect(links).toEqual([
        `/tecnicas/${ID}/datos-clinicos`,
        `/tecnicas/${OTHER_ID}/datos-clinicos`,
      ]);
    });

    it('el título de la pestaña del navegador es el nombre de la técnica', async () => {
      await respond();

      expect(document.title).toBe('Tiroidectomía · IQ Platform');
    });

    it('al cambiar de pestaña el título no vuelve al genérico y no se vuelve a pedir la técnica', async () => {
      await respond();
      await TestBed.inject(Router).navigateByUrl(`/tecnicas/${ID}/instrumental`);
      await settle();

      expect(document.title).toBe('Tiroidectomía · IQ Platform');
      http.expectNone(`${TEST_API_BASE}/techniques/${ID}`);
      expect(root.querySelector('[role=tabpanel]')!.id).toBe('panel-instrumental');
    });
  });

  describe('candado de las pestañas', () => {
    async function loadSession(logged: boolean): Promise<void> {
      const session = TestBed.inject(SessionService);
      const loading = session.load();
      const request = http.expectOne(`${TEST_API_BASE}/auth/me`);
      if (logged) {
        request.flush({ id: 'u-1', name: 'Ana', email: 'ana@example.com', role: 'user' });
      } else {
        request.flush(null, { status: 401, statusText: 'Unauthorized' });
      }
      await loading;
      await settle();
    }

    it('un visitante ve los candados de lo que pide cuenta', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      await respond();
      await loadSession(false);

      expect(root.querySelectorAll('.lock')).toHaveLength(3);
    });

    it('con sesión no hay candados', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      await respond();
      await loadSession(true);

      expect(root.querySelectorAll('.lock')).toHaveLength(0);
    });

    it('mientras no se sabe si hay sesión, tampoco', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      await respond();

      expect(root.querySelectorAll('.lock')).toHaveLength(0);
    });
  });

  describe('«No encontrada»', () => {
    it('una técnica que no existe (404)', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      http
        .expectOne(`${TEST_API_BASE}/techniques/${ID}`)
        .flush(null, { status: 404, statusText: 'Not Found' });
      answerColumn();
      await settle();

      expect(root.querySelector('app-not-found h1')!.textContent).toBe('No encontrada.');
      expect(root.querySelector('app-technique-column')).toBeNull();
      expect(root.querySelector('[role=tab]')).toBeNull();
      expect(document.title).toBe('No encontrada · IQ Platform');
    });

    it('una pestaña que no existe, sin pedir la técnica', async () => {
      await open(`/tecnicas/${ID}/mayo`);
      await settle();

      expect(root.querySelector('app-not-found')).not.toBeNull();
      http.expectNone(`${TEST_API_BASE}/techniques/${ID}`);
    });

    it('un id que no puede existir, sin pedirlo a la API', async () => {
      await open('/tecnicas/tiroidectomia/datos-clinicos');
      await settle();

      expect(root.querySelector('app-not-found')).not.toBeNull();
      http.expectNone((request) => request.url.includes('/techniques/'));
    });

    it('un error del servidor no es «No encontrada»', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      http
        .expectOne(`${TEST_API_BASE}/techniques/${ID}`)
        .flush(null, { status: 500, statusText: 'Server Error' });
      answerColumn();
      await settle();

      expect(root.querySelector('app-not-found')).toBeNull();
      expect(root.querySelector('app-technique-column')).not.toBeNull();
    });
  });

  describe('al cambiar de técnica', () => {
    it('pide la nueva y vuelve a mostrar barras mientras llega', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      await respond();

      await TestBed.inject(Router).navigateByUrl(`/tecnicas/${OTHER_ID}/datos-clinicos`);
      // Sin `whenStable`: con la petición pendiente no termina
      harness.detectChanges();

      const request = http.expectOne(`${TEST_API_BASE}/techniques/${OTHER_ID}`);
      expect(root.querySelector('.bone')).not.toBeNull();
      request.flush({ ...TECHNIQUE, id: OTHER_ID, name: 'Prostatectomía', specialty: 'Urología' });
      await settle();

      expect(root.querySelector('h1')!.textContent).toBe('Prostatectomía');
    });
  });
});

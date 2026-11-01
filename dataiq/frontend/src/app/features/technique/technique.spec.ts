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
    // Sin `whenStable`: con las mesas pendientes no termina
    await Promise.resolve();
    harness.detectChanges();
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

    it('los datos clínicos salen de la técnica y no piden cuenta', async () => {
      await respond({
        ...TECHNIQUE,
        description: 'Extirpación de la glándula tiroides.',
        anesthesia: 'General',
      });

      const sheet = root.querySelector('[role=tabpanel]')!;
      expect(sheet.querySelector('.purpose p')!.textContent).toBe(
        'Extirpación de la glándula tiroides.',
      );
      expect(sheet.querySelector('.facts dd')!.textContent).toBe('General');
      http.expectNone(`${TEST_API_BASE}/techniques/${ID}/instruments`);
    });

    it('otra pestaña no muestra los datos clínicos', async () => {
      await respond({ ...TECHNIQUE, description: 'Extirpación de la glándula tiroides.' });

      await TestBed.inject(Router).navigateByUrl(`/tecnicas/${ID}/instrumental`);
      await settle();

      expect(root.querySelector('app-technique-clinical')).toBeNull();
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

  describe('hojas de mesa', () => {
    const INSTRUMENTS = {
      zones: [
        { zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 4, columns: 6 },
        { zone_id: 'z-reserva', zone: 'Mesa de reserva', used: false, rows: null, columns: null },
      ],
      items: [
        {
          id: 'i-1',
          zone_id: 'z-mayo',
          zone: 'Mesa de Mayo',
          legend_number: 1,
          source_text: 'Pinza Kelly',
          components: [{ name: 'Pinza Kelly', instrument_id: 'x', suture_id: null }],
          cells: [{ row: 1, column: 1 }],
        },
      ],
      sutures: [],
      equipment: [],
      devices: [],
    };

    async function openAs(logged: boolean, tab: string): Promise<void> {
      await open(`/tecnicas/${ID}/${tab}`);
      await respond();
      await loadSession(logged);
    }

    it('con sesión, la mesa de Mayo trae su leyenda y su diagrama', async () => {
      await openAs(true, 'mesa-de-mayo');
      http.expectOne(`${TEST_API_BASE}/techniques/${ID}/instruments`).flush(INSTRUMENTS);
      await settle();

      expect(root.querySelector('[role=tabpanel] h2')!.textContent).toBe('Mesa de Mayo');
      expect(root.querySelectorAll('[role=tabpanel] app-table-legend li')).toHaveLength(1);
      expect(root.querySelector('[role=tabpanel] app-table-diagram')).not.toBeNull();
    });

    it('dice «Cargando…» mientras llegan las mesas', async () => {
      await openAs(true, 'mesa-de-mayo');

      expect(root.querySelector('[role=tabpanel] .loading')!.textContent).toBe('Cargando…');
      http.expectOne(`${TEST_API_BASE}/techniques/${ID}/instruments`);
    });

    it('una mesa que la técnica no lleva dice que no la hay', async () => {
      await openAs(true, 'mesa-de-reserva');
      http.expectOne(`${TEST_API_BASE}/techniques/${ID}/instruments`).flush(INSTRUMENTS);
      await settle();

      expect(root.querySelector('[role=tabpanel] .none')!.textContent).toBe('Sin mesa de reserva.');
    });

    it('pasar de una mesa a otra no vuelve a pedir lo de la técnica', async () => {
      await openAs(true, 'mesa-de-mayo');
      http.expectOne(`${TEST_API_BASE}/techniques/${ID}/instruments`).flush(INSTRUMENTS);
      await settle();

      await TestBed.inject(Router).navigateByUrl(`/tecnicas/${ID}/mesa-de-reserva`);
      await settle();

      http.expectNone(`${TEST_API_BASE}/techniques/${ID}/instruments`);
      expect(root.querySelector('[role=tabpanel] .none')!.textContent).toBe('Sin mesa de reserva.');
    });

    it('sin sesión no se piden las mesas: la puerta de cuenta, con su vistazo', async () => {
      await openAs(false, 'mesa-de-mayo');

      http.expectNone(`${TEST_API_BASE}/techniques/${ID}/instruments`);
      const sheet = root.querySelector('[role=tabpanel]')!;
      expect(sheet.querySelector('app-technique-gate strong')!.textContent).toBe(
        'Ver la mesa de Mayo',
      );
      expect(sheet.querySelector('app-table-diagram')!.getAttribute('data-variant')).toBe(
        'preview',
      );
      expect(sheet.querySelector('app-technique-table')).toBeNull();
    });

    it('la puerta de la mesa de reserva es la misma, sin decir si la técnica la lleva', async () => {
      await openAs(false, 'mesa-de-reserva');

      const sheet = root.querySelector('[role=tabpanel]')!;
      expect(sheet.querySelector('app-technique-gate strong')!.textContent).toBe(
        'Ver la mesa de reserva',
      );
      expect(sheet.textContent).not.toMatch(/Sin mesa/);
      expect(sheet.querySelector('app-table-diagram')).not.toBeNull();
    });

    it('«Ya tengo cuenta» vuelve a la pestaña que se quería abrir', async () => {
      await openAs(false, 'mesa-de-mayo');

      const login = root.querySelector<HTMLAnchorElement>('app-technique-gate .login')!;
      expect(login.getAttribute('href')).toBe(
        '/cuenta/ingresar?volver=%2Ftecnicas%2F' + ID + '%2Fmesa-de-mayo',
      );
    });

    it('con sesión no hay puerta', async () => {
      await openAs(true, 'mesa-de-mayo');
      http.expectOne(`${TEST_API_BASE}/techniques/${ID}/instruments`).flush(INSTRUMENTS);
      await settle();

      expect(root.querySelector('app-technique-gate')).toBeNull();
    });

    it('mientras no se sabe si hay sesión, tampoco hay puerta', async () => {
      await open(`/tecnicas/${ID}/mesa-de-mayo`);
      await respond();

      expect(root.querySelector('app-technique-gate')).toBeNull();
    });

    it('los datos clínicos no llevan puerta, ni a un visitante', async () => {
      await openAs(false, 'datos-clinicos');

      expect(root.querySelector('app-technique-gate')).toBeNull();
      expect(root.querySelector('app-technique-clinical')).not.toBeNull();
    });

    it('con sesión, Instrumental trae los objetos y las suturas por plano', async () => {
      await openAs(true, 'instrumental');
      http.expectOne(`${TEST_API_BASE}/techniques/${ID}/instruments`).flush({
        ...INSTRUMENTS,
        sutures: [
          { id: 's-1', name: 'Seda', gauge: '2/0', needle_type: null, usage: 'Piel; Fascia' },
        ],
      });
      await settle();

      const sheet = root.querySelector('[role=tabpanel]')!;
      expect(sheet.querySelectorAll('app-technique-instrumental .objects li')).toHaveLength(1);
      expect(Array.from(sheet.querySelectorAll('.sutures dt')).map((dt) => dt.textContent)).toEqual(
        ['Piel', 'Fascia'],
      );
    });

    it('dice «Cargando…» mientras llega el instrumental', async () => {
      await openAs(true, 'instrumental');

      expect(root.querySelector('[role=tabpanel] .loading')!.textContent).toBe('Cargando…');
      http.expectOne(`${TEST_API_BASE}/techniques/${ID}/instruments`);
    });

    it('sin sesión Instrumental muestra la puerta, con barras en lugar de objetos, y no pide nada', async () => {
      await openAs(false, 'instrumental');

      http.expectNone(`${TEST_API_BASE}/techniques/${ID}/instruments`);
      const sheet = root.querySelector('[role=tabpanel]')!;
      expect(sheet.querySelector('app-technique-gate strong')!.textContent).toBe(
        'Ver el instrumental completo',
      );
      expect(sheet.querySelectorAll('.objects .bone')).toHaveLength(6);
      expect(sheet.querySelector('app-technique-instrumental')).toBeNull();
    });

    it('de Instrumental a una mesa no vuelve a pedir lo de la técnica', async () => {
      await openAs(true, 'instrumental');
      http.expectOne(`${TEST_API_BASE}/techniques/${ID}/instruments`).flush(INSTRUMENTS);
      await settle();

      await TestBed.inject(Router).navigateByUrl(`/tecnicas/${ID}/mesa-de-mayo`);
      await settle();

      http.expectNone(`${TEST_API_BASE}/techniques/${ID}/instruments`);
      expect(root.querySelector('[role=tabpanel] app-table-legend')).not.toBeNull();
    });

    it('los datos clínicos no piden las mesas', async () => {
      await openAs(true, 'datos-clinicos');

      http.expectNone(`${TEST_API_BASE}/techniques/${ID}/instruments`);
    });
  });

  describe('«Ver en 3D» y «Comprobar con la cámara»', () => {
    const actions = () =>
      Array.from(root.querySelectorAll<HTMLAnchorElement>('header .actions a')).map((a) => [
        a.textContent!.replace(/\s+/g, ' ').trim(),
        a.getAttribute('href'),
      ]);

    it('con sesión llevan a SIMIQ3D (con la técnica) y a SIVRI, con navegación completa', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      await respond();
      await loadSession(true);

      expect(actions()).toEqual([
        ['Ver en 3D SIMIQ3D', `/simiq3d/tecnicas/${ID}`],
        ['Comprobar con la cámara SIVRI', '/sivri/'],
      ]);
    });

    it('sin sesión llevan a crear la cuenta, con la pestaña a la que volver', async () => {
      await open(`/tecnicas/${ID}/instrumental`);
      await respond();
      await loadSession(false);

      const volver = '?volver=%2Ftecnicas%2F' + ID + '%2Finstrumental';
      expect(actions()).toEqual([
        ['Ver en 3D SIMIQ3D', '/cuenta/crear' + volver],
        ['Comprobar con la cámara SIVRI', '/cuenta/crear' + volver],
      ]);
    });

    it('mientras no se sabe si hay sesión no se muestran', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      await respond();

      expect(root.querySelector('header .actions')).toBeNull();
    });

    it('están aunque la técnica aún no haya llegado', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      answerColumn();
      await loadSession(true);

      expect(root.querySelector('.bone')).not.toBeNull();
      expect(actions()).toHaveLength(2);
    });

    it('el suave es «Ver en 3D» y el verde, «Comprobar con la cámara»', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      await respond();
      await loadSession(true);

      const variants = Array.from(root.querySelectorAll('header .actions a')).map((a) =>
        a.getAttribute('data-variant'),
      );
      expect(variants).toEqual(['soft', 'primary']);
    });

    it('una técnica que no existe no los lleva', async () => {
      await open(`/tecnicas/${ID}/datos-clinicos`);
      http
        .expectOne(`${TEST_API_BASE}/techniques/${ID}`)
        .flush(null, { status: 404, statusText: 'Not Found' });
      answerColumn();
      await settle();
      await loadSession(true);

      expect(root.querySelector('header .actions')).toBeNull();
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

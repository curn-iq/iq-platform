import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionService } from '../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import type { Role } from '../../domain/role';
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
const ARCHIVE_URL = `${TEST_API_BASE}/techniques/${ID}/archive`;
const NO_CONTENT = { status: 204, statusText: 'No Content' };

const inProgress = (technique: string) => ({
  id: `v-${technique}`,
  technique_id: technique,
  technique: 'Tiroidectomía',
  specialty: 'Cirugía general',
  number: 2,
  state: 'draft',
  created_by: 'u-2',
  author: 'Daniela Ortiz',
  updated_at: '2026-10-03T15:00:00Z',
});

describe('TechniqueDetail: archivar', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let root: HTMLElement;

  async function settle(): Promise<void> {
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
      TestBed.tick();
      harness.detectChanges();
    }
  }

  /** Abre el detalle con esa sesión y responde todo lo que pide (la lista de versiones en curso, si la pide). */
  async function open(role: Role, versions: object[] = []): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([{ path: 'tecnicas/:id/:pestana', component: TechniqueDetail }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const session = TestBed.inject(SessionService);
    const loading = session.load();
    http
      .expectOne(`${TEST_API_BASE}/auth/me`)
      .flush({ id: 'u-1', name: 'Laura', email: 'laura@example.com', role });
    await loading;
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/tecnicas/${ID}/datos-clinicos`);
    root = harness.routeNativeElement as HTMLElement;
    http.expectOne(`${TEST_API_BASE}/techniques/${ID}`).flush(TECHNIQUE);
    http.expectOne(`${TEST_API_BASE}/techniques`).flush(LIST);
    http.expectOne(`${TEST_API_BASE}/specialties`).flush(SPECIALTIES);
    if (role !== 'user') {
      http.expectOne((request) => request.url === `${TEST_API_BASE}/versions`).flush(versions);
    }
    await settle();
  }

  afterEach(() => http?.verify());

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const actionLabels = () =>
    Array.from(root.querySelectorAll('.actions .edit, .actions .trigger, .actions > a')).map(
      (el) => el.getAttribute('aria-label') ?? text(el),
    );
  const trigger = () =>
    root.querySelector<HTMLButtonElement>('app-technique-more-actions .trigger');

  async function archive(): Promise<void> {
    trigger()!.click();
    await settle();
    root.querySelector<HTMLButtonElement>('app-technique-more-actions .item')!.click();
    await settle();
    root.querySelector<HTMLButtonElement>('app-technique-more-actions .confirm button')!.click();
    await settle();
    http.expectOne(ARCHIVE_URL).flush(null, NO_CONTENT);
    await settle();
  }

  describe('quién ve «Más acciones»', () => {
    it('un revisor lo ve junto a «Editar técnica», antes de los módulos', async () => {
      await open('reviewer');

      expect(actionLabels()).toEqual([
        'Editar técnica',
        'Más acciones',
        'Ver en 3D SIMIQ3D',
        'Comprobar con la cámara SIVRI',
      ]);
    });

    it('un admin también', async () => {
      await open('admin');

      expect(trigger()).not.toBeNull();
    });

    it('un colaborador puede editar pero no archivar', async () => {
      await open('contributor');

      expect(actionLabels()[0]).toBe('Editar técnica');
      expect(trigger()).toBeNull();
    });

    it('un usuario no tiene ni lo uno ni lo otro', async () => {
      await open('user');

      expect(trigger()).toBeNull();
      expect(actionLabels()).toEqual(['Ver en 3D SIMIQ3D', 'Comprobar con la cámara SIVRI']);
    });
  });

  it('las versiones en curso se piden una sola vez para «Editar técnica» y «Archivar técnica»', async () => {
    await open('reviewer');

    // `open` ya comprobó, con `expectOne`, que hubo una sola petición; no queda ninguna más
    http.expectNone((request) => request.url === `${TEST_API_BASE}/versions`);
  });

  it('con una versión en curso de esta técnica, archivar queda atenuado con su motivo', async () => {
    await open('reviewer', [inProgress(ID)]);
    trigger()!.click();
    await settle();

    const item = root.querySelector<HTMLButtonElement>('app-technique-more-actions .item')!;
    expect(item.getAttribute('aria-disabled')).toBe('true');
    expect(text(item.querySelector('small'))).toBe(
      'No se puede mientras tenga una versión en curso.',
    );
  });

  describe('al archivar', () => {
    beforeEach(async () => {
      await open('reviewer');
      await archive();
    });

    it('el detalle dice que está archivada, bajo la especialidad, y recibe el foco', () => {
      const notice = root.querySelector<HTMLElement>('header p.archived')!;

      expect(text(notice)).toBe('Técnica archivada. Ya no está en el catálogo.');
      expect(notice.getAttribute('role')).toBe('status');
      expect(document.activeElement).toBe(notice);
      expect(text(root.querySelector('header .titles p'))).toBe('Cirugía general');
    });

    it('se queda con lo que ya tenía cargado: el nombre y la hoja', () => {
      expect(text(root.querySelector('h1'))).toBe('Tiroidectomía');
      expect(root.querySelector('app-technique-clinical')).not.toBeNull();
    });

    it('pierde Editar, Más acciones y los módulos', () => {
      expect(root.querySelector('.actions')).toBeNull();
      expect(root.querySelector('app-technique-edit-action')).toBeNull();
      expect(trigger()).toBeNull();
      expect(root.querySelector('a[href*="simiq3d"], a[href*="sivri"]')).toBeNull();
    });

    it('la columna la marca «Archivada», y las demás no', () => {
      const archived = Array.from(root.querySelectorAll('app-technique-column .archived'));

      expect(archived.map((el) => text(el))).toEqual(['Archivada']);
      expect(archived[0].closest('a')!.getAttribute('href')).toBe(`/tecnicas/${ID}/datos-clinicos`);
    });

    it('el selector de celular suma « · archivada»', () => {
      expect(text(root.querySelector('app-technique-column .toggle'))).toBe(
        'Cirugía general · Tiroidectomía · archivada',
      );
    });
  });

  it('al ir a otra técnica el aviso se va y vuelven las acciones', async () => {
    await open('reviewer');
    await archive();

    await harness.navigateByUrl(`/tecnicas/${OTHER_ID}/datos-clinicos`);
    http
      .expectOne(`${TEST_API_BASE}/techniques/${OTHER_ID}`)
      .flush({ ...TECHNIQUE, id: OTHER_ID, name: 'Prostatectomía', specialty: 'Urología' });
    await settle();

    expect(root.querySelector('header p.archived')).toBeNull();
    expect(actionLabels()[0]).toBe('Editar técnica');
    expect(trigger()).not.toBeNull();
  });
});

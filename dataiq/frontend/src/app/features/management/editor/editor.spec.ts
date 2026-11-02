import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import { Editor } from './editor';

const ID = '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f';

function version(state = 'draft', number = 2, rejections: object[] = []) {
  return {
    summary: {
      id: ID,
      technique_id: 't-1',
      technique: 'Colecistectomía',
      specialty: 'Cirugía general',
      number,
      state,
      created_by: 'u-1',
      author: 'Ana Ruiz',
      updated_at: '2026-10-03T15:00:00Z',
    },
    content: {},
    rejections,
  };
}

describe('Editor', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let root: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([
          { path: 'gestion/editor/nueva', component: Editor },
          { path: 'gestion/editor/:versionId/:paso', component: Editor },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const text = (selector: string) =>
    root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  async function open(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    root = harness.routeNativeElement as HTMLElement;
  }

  async function answer(body: object): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/versions/${ID}`).flush(body);
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  describe('una técnica nueva', () => {
    it('sin versión pide nombre y especialidad', async () => {
      await open('/gestion/editor/nueva');
      http.expectOne(`${TEST_API_BASE}/specialties`).flush([]);

      expect(root.querySelector('app-new-technique')).not.toBeNull();
      expect(root.querySelector('app-more-actions')).toBeNull();
    });
  });

  describe('una versión', () => {
    it('pide la versión y muestra su cabecera: ruta de vuelta, nombre, especialidad, versión y estado', async () => {
      await open(`/gestion/editor/${ID}/datos-clinicos`);
      expect(root.querySelector('h1')).toBeNull();
      expect(root.querySelector('section')!.getAttribute('aria-busy')).toBe('true');
      await answer(version());

      expect(root.querySelector('app-new-technique')).toBeNull();
      expect(text('.route')).toBe('Mis borradores');
      expect(root.querySelector('.route')!.getAttribute('href')).toBe('/gestion/borradores');
      expect(text('h1')).toBe('Colecistectomía');
      expect(text('.meta')).toBe('Cirugía general · Versión 2 Borrador');
      expect(root.querySelector('section')!.getAttribute('aria-busy')).toBeNull();
    });

    it('lleva «Más acciones», con la versión para descartarla', async () => {
      await open(`/gestion/editor/${ID}/datos-clinicos`);
      await answer(version());

      expect(
        root.querySelector('app-more-actions button[aria-label="Más acciones"]'),
      ).not.toBeNull();
    });

    it('un borrador con devoluciones dice «Devuelta»', async () => {
      await open(`/gestion/editor/${ID}/datos-clinicos`);
      await answer(version('draft', 2, [{ reason: 'Falta la fuente.' }]));
      expect(text('app-status-pill')).toBe('Devuelta');
    });

    it('en revisión dice «En revisión»', async () => {
      await open(`/gestion/editor/${ID}/datos-clinicos`);
      await answer(version('in_review'));

      expect(text('app-status-pill')).toBe('En revisión');
    });

    it('una versión que ya no está en curso no lleva pastilla de borrador', async () => {
      await open(`/gestion/editor/${ID}/datos-clinicos`);
      await answer(version('published'));

      expect(root.querySelector('app-status-pill')).toBeNull();
      expect(text('h1')).toBe('Colecistectomía');
    });

    it('si la API responde 404, «No encontrada»', async () => {
      await open(`/gestion/editor/${ID}/datos-clinicos`);
      http
        .expectOne(`${TEST_API_BASE}/versions/${ID}`)
        .flush(null, { status: 404, statusText: 'Not Found' });
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(root.querySelector('app-not-found')).not.toBeNull();
      expect(root.querySelector('h1')!.textContent).toContain('No encontrada');
    });

    it('un id que no puede ser de una versión es «No encontrada» y ni se pide', async () => {
      await open('/gestion/editor/abc/datos-clinicos');

      expect(root.querySelector('app-not-found')).not.toBeNull();
      http.expectNone(() => true);
    });

    it('si la API falla por otra cosa (el interceptor avisa), queda la ruta de vuelta', async () => {
      await open(`/gestion/editor/${ID}/datos-clinicos`);
      http
        .expectOne(`${TEST_API_BASE}/versions/${ID}`)
        .flush(null, { status: 500, statusText: 'Server Error' });
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(root.querySelector('app-not-found')).toBeNull();
      expect(root.querySelector('.route')).not.toBeNull();
      expect(root.querySelector('h1')).toBeNull();
    });
  });
});

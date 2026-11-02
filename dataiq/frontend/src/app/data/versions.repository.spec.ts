import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_API_BASE } from './testing';
import { VersionsFilter, VersionsRepository } from './versions.repository';

describe('VersionsRepository', () => {
  let repository: VersionsRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    repository = TestBed.inject(VersionsRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list', () => {
    it('sin filtro pide /versions sin parámetros', async () => {
      const resource = TestBed.runInInjectionContext(() => repository.list());
      TestBed.tick();

      const request = http.expectOne(`${TEST_API_BASE}/versions`);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);
      request.flush([]);
      await Promise.resolve();
      TestBed.tick();

      expect(resource.value()).toEqual([]);
    });

    it('manda cada estado como un parámetro repetido, y los booleanos con su nombre de la API', () => {
      TestBed.runInInjectionContext(() =>
        repository.list(() => ({
          state: ['draft', 'in_review'],
          mine: true,
          reviewedByMe: false,
        })),
      );
      TestBed.tick();

      const request = http.expectOne((r) => r.url === `${TEST_API_BASE}/versions`);
      expect(request.request.params.getAll('state')).toEqual(['draft', 'in_review']);
      expect(request.request.params.get('mine')).toBe('true');
      expect(request.request.params.get('reviewed_by_me')).toBe('false');
      request.flush([]);
    });

    it('omite una lista de estados vacía', () => {
      TestBed.runInInjectionContext(() => repository.list(() => ({ state: [] })));
      TestBed.tick();

      const request = http.expectOne(`${TEST_API_BASE}/versions`);
      expect(request.request.params.has('state')).toBe(false);
      request.flush([]);
    });

    it('un filtro indefinido no pide nada hasta que haya filtro', () => {
      const filter = signal<VersionsFilter | undefined>(undefined);
      TestBed.runInInjectionContext(() => repository.list(filter));
      TestBed.tick();
      http.expectNone(() => true);

      filter.set({ mine: true });
      TestBed.tick();
      http.expectOne((r) => r.params.get('mine') === 'true').flush([]);
    });
  });

  describe('get', () => {
    it('sin id no pide nada; con id pide la versión', () => {
      const id = signal<string | undefined>(undefined);
      TestBed.runInInjectionContext(() => repository.get(id));
      TestBed.tick();
      http.expectNone(() => true);

      id.set('v-1');
      TestBed.tick();
      http.expectOne(`${TEST_API_BASE}/versions/v-1`).flush({});
    });

    it('codifica el id en la ruta', () => {
      TestBed.runInInjectionContext(() => repository.get(() => 'a/b'));
      TestBed.tick();
      http.expectOne(`${TEST_API_BASE}/versions/a%2Fb`).flush({});
    });
  });

  describe('getMany', () => {
    const flushed = async () => {
      await Promise.resolve();
      TestBed.tick();
    };

    it('pide cada versión y entrega todas juntas, en el orden de los ids', async () => {
      const resource = TestBed.runInInjectionContext(() =>
        repository.getMany(() => ['v-1', 'v-2']),
      );
      TestBed.tick();

      // Responden en otro orden: el resultado sigue el de los ids
      http.expectOne(`${TEST_API_BASE}/versions/v-2`).flush({ summary: { id: 'v-2' } });
      http.expectOne(`${TEST_API_BASE}/versions/v-1`).flush({ summary: { id: 'v-1' } });
      await flushed();

      expect(resource.value()).toEqual([{ summary: { id: 'v-1' } }, { summary: { id: 'v-2' } }]);
    });

    it('sin ids no pide nada y entrega una lista vacía', async () => {
      const resource = TestBed.runInInjectionContext(() => repository.getMany(() => []));
      TestBed.tick();
      await flushed();

      http.expectNone(() => true);
      expect(resource.value()).toEqual([]);
    });

    it('con ids indefinidos no pide nada hasta que los haya', async () => {
      const ids = signal<string[] | undefined>(undefined);
      const resource = TestBed.runInInjectionContext(() => repository.getMany(ids));
      TestBed.tick();
      http.expectNone(() => true);
      expect(resource.value()).toBeUndefined();

      ids.set(['v-1']);
      TestBed.tick();
      http.expectOne(`${TEST_API_BASE}/versions/v-1`).flush({ summary: { id: 'v-1' } });
      await flushed();

      expect(resource.value()).toEqual([{ summary: { id: 'v-1' } }]);
    });

    it('si una falla, falla todo, y volver a pedir lo reintenta', async () => {
      const resource = TestBed.runInInjectionContext(() =>
        repository.getMany(() => ['v-1', 'v-2']),
      );
      TestBed.tick();

      http
        .expectOne(`${TEST_API_BASE}/versions/v-1`)
        .flush(null, { status: 500, statusText: 'Server Error' });
      await flushed();
      expect(resource.error()).toBeDefined();
      // La otra petición se cancela sola al fallar la primera
      http.match(`${TEST_API_BASE}/versions/v-2`);

      resource.reload();
      TestBed.tick();
      http.expectOne(`${TEST_API_BASE}/versions/v-1`).flush({ summary: { id: 'v-1' } });
      http.expectOne(`${TEST_API_BASE}/versions/v-2`).flush({ summary: { id: 'v-2' } });
      await flushed();

      expect(resource.error()).toBeUndefined();
      expect(resource.value()).toHaveLength(2);
    });

    it('codifica el id en la ruta', () => {
      TestBed.runInInjectionContext(() => repository.getMany(() => ['a/b']));
      TestBed.tick();

      http.expectOne(`${TEST_API_BASE}/versions/a%2Fb`).flush({});
    });
  });

  describe('escrituras', () => {
    it('update reemplaza el contenido con PUT', () => {
      let result: unknown;
      repository.update('v-1', { clinical: null } as never).subscribe((v) => (result = v));

      const request = http.expectOne(`${TEST_API_BASE}/versions/v-1`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ clinical: null });
      request.flush({ id: 'v-1' });
      expect(result).toEqual({ id: 'v-1' });
    });

    it('discard borra con DELETE', () => {
      repository.discard('v-1').subscribe();
      const request = http.expectOne(`${TEST_API_BASE}/versions/v-1`);
      expect(request.request.method).toBe('DELETE');
      request.flush(null, { status: 204, statusText: 'No Content' });
    });

    it.each(['submit', 'publish', 'approve'] as const)('%s hace POST sin cuerpo', (action) => {
      repository[action]('v-1').subscribe();
      const request = http.expectOne(`${TEST_API_BASE}/versions/v-1/${action}`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toBeNull();
      request.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('reject manda el motivo', () => {
      repository.reject('v-1', 'Falta la fuente').subscribe();
      const request = http.expectOne(`${TEST_API_BASE}/versions/v-1/reject`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ reason: 'Falta la fuente' });
      request.flush(null, { status: 204, statusText: 'No Content' });
    });
  });
});

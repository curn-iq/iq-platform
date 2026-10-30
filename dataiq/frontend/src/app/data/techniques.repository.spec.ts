import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_API_BASE } from './testing';
import { TechniquesRepository } from './techniques.repository';

describe('TechniquesRepository', () => {
  let repository: TechniquesRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    repository = TestBed.inject(TechniquesRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list pide las técnicas publicadas y expone la respuesta', async () => {
    const resource = TestBed.runInInjectionContext(() => repository.list());
    TestBed.tick();

    const request = http.expectOne(`${TEST_API_BASE}/techniques`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 't-1', name: 'Tiroidectomía' }]);
    await Promise.resolve();
    TestBed.tick();

    expect(resource.value()).toEqual([{ id: 't-1', name: 'Tiroidectomía' }]);
  });

  it('specialties pide /specialties', () => {
    TestBed.runInInjectionContext(() => repository.specialties());
    TestBed.tick();
    http.expectOne(`${TEST_API_BASE}/specialties`).flush([]);
  });

  it('get no pide nada sin id y pide la técnica cuando lo hay', () => {
    const id = signal<string | undefined>(undefined);
    TestBed.runInInjectionContext(() => repository.get(id));
    TestBed.tick();
    http.expectNone(() => true);

    id.set('t-1');
    TestBed.tick();
    http.expectOne(`${TEST_API_BASE}/techniques/t-1`).flush({});
  });

  it('get vuelve a pedir cuando cambia el id', () => {
    const id = signal<string | undefined>('t-1');
    TestBed.runInInjectionContext(() => repository.get(id));
    TestBed.tick();
    http.expectOne(`${TEST_API_BASE}/techniques/t-1`).flush({});

    id.set('t-2');
    TestBed.tick();
    http.expectOne(`${TEST_API_BASE}/techniques/t-2`).flush({});
  });

  it('instruments no pide nada sin id y pide el instrumental de la técnica', () => {
    const id = signal<string | undefined>(undefined);
    TestBed.runInInjectionContext(() => repository.instruments(id));
    TestBed.tick();
    http.expectNone(() => true);

    id.set('t-1');
    TestBed.tick();
    http.expectOne(`${TEST_API_BASE}/techniques/t-1/instruments`).flush({});
  });

  it('create manda la técnica con POST y devuelve la versión 1', () => {
    let result: unknown;
    repository
      .create({ name: 'Tiroidectomía', specialty_id: 's-1' })
      .subscribe((version) => (result = version));

    const request = http.expectOne(`${TEST_API_BASE}/techniques`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Tiroidectomía', specialty_id: 's-1' });
    request.flush({ id: 'v-1' });
    expect(result).toEqual({ id: 'v-1' });
  });

  it('createVersion hace POST sin cuerpo a las versiones de la técnica', () => {
    repository.createVersion('t-1').subscribe();
    const request = http.expectOne(`${TEST_API_BASE}/techniques/t-1/versions`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ id: 'v-2' });
  });

  it('archive hace POST sin cuerpo a /archive', () => {
    repository.archive('t-1').subscribe();
    const request = http.expectOne(`${TEST_API_BASE}/techniques/t-1/archive`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});

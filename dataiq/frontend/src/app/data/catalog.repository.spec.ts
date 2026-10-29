import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogRepository } from './catalog.repository';
import { provideRepositoryTesting, TEST_API_BASE } from './testing';

describe('CatalogRepository', () => {
  let repository: CatalogRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    repository = TestBed.inject(CatalogRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('full pide /catalog/full', () => {
    TestBed.runInInjectionContext(() => repository.full());
    TestBed.tick();
    http.expectOne(`${TEST_API_BASE}/catalog/full`).flush({});
  });

  it('instruments pide /instruments', () => {
    TestBed.runInInjectionContext(() => repository.instruments());
    TestBed.tick();
    http.expectOne(`${TEST_API_BASE}/instruments`).flush([]);
  });

  it('createInstrument manda el instrumento con POST', () => {
    const instrument = { name: 'Pinza de Moynihan', category_id: 'c-1' } as never;
    repository.createInstrument(instrument).subscribe();

    const request = http.expectOne(`${TEST_API_BASE}/instruments`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBe(instrument);
    request.flush({ id: 'i-1' });
  });

  it('updateInstrument manda los cambios con PATCH, con los alias completos', () => {
    repository.updateInstrument('i-1', { aliases: ['Pinza Moynihan'] } as never).subscribe();

    const request = http.expectOne(`${TEST_API_BASE}/instruments/i-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ aliases: ['Pinza Moynihan'] });
    request.flush({ id: 'i-1' });
  });
});

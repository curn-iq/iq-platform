import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { HomeCatalog } from './home-catalog';

describe('HomeCatalog', () => {
  let http: HttpTestingController;
  let catalog: HomeCatalog;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), HomeCatalog],
    });
    http = TestBed.inject(HttpTestingController);
    catalog = TestBed.inject(HomeCatalog);
    TestBed.tick();
  });

  afterEach(() => http.match(() => true));

  async function respond(): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/techniques`).flush([
      { id: 't-1', name: 'Prostatectomía', specialty: 'Urología', version_number: 1 },
      { id: 't-2', name: 'Mastectomía', specialty: 'Cirugía general', version_number: 2 },
    ]);
    http.expectOne(`${TEST_API_BASE}/specialties`).flush([
      { id: 'e-1', name: 'Cirugía general' },
      { id: 'e-2', name: 'Urología' },
      { id: 'e-3', name: 'Ortopedia' },
    ]);
    await Promise.resolve();
    TestBed.tick();
  }

  it('está vacío y cargando hasta que llegan las dos respuestas', () => {
    expect(catalog.groups()).toEqual([]);
    expect(catalog.loading()).toBe(true);
  });

  it('agrupa las técnicas por especialidad, en el orden de la API, sin las vacías', async () => {
    await respond();

    expect(catalog.loading()).toBe(false);
    expect(catalog.groups().map((g) => [g.specialty, g.techniques.map((t) => t.id)])).toEqual([
      ['Cirugía general', ['t-2']],
      ['Urología', ['t-1']],
    ]);
  });

  it('si una petición falla, queda vacío y deja de cargar', async () => {
    http
      .expectOne(`${TEST_API_BASE}/techniques`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne(`${TEST_API_BASE}/specialties`).flush([{ id: 'e-1', name: 'Cirugía general' }]);
    await Promise.resolve();
    TestBed.tick();

    expect(catalog.groups()).toEqual([]);
    expect(catalog.loading()).toBe(false);
  });
});

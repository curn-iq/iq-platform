import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { SpecialtiesNav } from './specialties-nav';

describe('SpecialtiesNav', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function settle(): Promise<void> {
    await Promise.resolve();
    TestBed.tick();
  }

  it('no pide nada hasta que alguien lo usa', () => {
    TestBed.tick();

    http.expectNone(() => true);
  });

  it('pide las especialidades y las técnicas, y empieza vacío', () => {
    const nav = TestBed.inject(SpecialtiesNav);
    TestBed.tick();

    http.expectOne(`${TEST_API_BASE}/specialties`);
    http.expectOne(`${TEST_API_BASE}/techniques`);
    expect(nav.entries()).toEqual([]);
    expect(nav.loading()).toBe(true);
  });

  it('junta a cada especialidad con los nombres de sus técnicas, en el orden de la API', async () => {
    const nav = TestBed.inject(SpecialtiesNav);
    TestBed.tick();

    http.expectOne(`${TEST_API_BASE}/specialties`).flush([
      { id: 'e-1', name: 'Cirugía general' },
      { id: 'e-2', name: 'Urología' },
      { id: 'e-3', name: 'Ortopedia' },
    ]);
    http.expectOne(`${TEST_API_BASE}/techniques`).flush([
      { id: 't-1', name: 'Mastectomía', specialty: 'Cirugía general', version_number: 1 },
      { id: 't-2', name: 'Prostatectomía', specialty: 'Urología', version_number: 1 },
      { id: 't-3', name: 'Tiroidectomía', specialty: 'Cirugía general', version_number: 2 },
    ]);
    await settle();

    expect(nav.loading()).toBe(false);
    expect(nav.entries()).toEqual([
      { id: 'e-1', name: 'Cirugía general', techniques: ['Mastectomía', 'Tiroidectomía'] },
      { id: 'e-2', name: 'Urología', techniques: ['Prostatectomía'] },
      { id: 'e-3', name: 'Ortopedia', techniques: [] },
    ]);
  });

  it('`retry()` vuelve a pedir solo lo que falló', async () => {
    const nav = TestBed.inject(SpecialtiesNav);
    TestBed.tick();
    http.expectOne(`${TEST_API_BASE}/specialties`).flush([{ id: 'e-1', name: 'Urología' }]);
    http
      .expectOne(`${TEST_API_BASE}/techniques`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    nav.retry();
    TestBed.tick();

    http.expectNone(`${TEST_API_BASE}/specialties`);
    http
      .expectOne(`${TEST_API_BASE}/techniques`)
      .flush([{ id: 't-1', name: 'Prostatectomía', specialty: 'Urología', version_number: 1 }]);
    await settle();
    expect(nav.entries()).toEqual([
      { id: 'e-1', name: 'Urología', techniques: ['Prostatectomía'] },
    ]);
  });
});

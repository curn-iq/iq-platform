import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_API_BASE } from '../data/testing';
import { Specialties } from './specialties';

describe('Specialties', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide las especialidades una vez y empieza vacío y cargando', () => {
    const specialties = TestBed.inject(Specialties);
    TestBed.tick();

    http.expectOne(`${TEST_API_BASE}/specialties`);
    expect(specialties.list()).toEqual([]);
    expect(specialties.loading()).toBe(true);
  });

  it('expone la lista en el orden de la API al llegar', async () => {
    const specialties = TestBed.inject(Specialties);
    TestBed.tick();

    http.expectOne(`${TEST_API_BASE}/specialties`).flush([
      { id: 'e-1', name: 'Cirugía general' },
      { id: 'e-2', name: 'Urología' },
    ]);
    await Promise.resolve();
    TestBed.tick();

    expect(specialties.loading()).toBe(false);
    expect(specialties.list().map((s) => s.name)).toEqual(['Cirugía general', 'Urología']);
  });

  it('si la petición falla, la lista queda vacía y no lanza', async () => {
    const specialties = TestBed.inject(Specialties);
    TestBed.tick();

    http
      .expectOne(`${TEST_API_BASE}/specialties`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await Promise.resolve();
    TestBed.tick();

    expect(specialties.loading()).toBe(false);
    expect(specialties.list()).toEqual([]);
  });
});

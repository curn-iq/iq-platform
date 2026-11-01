import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import { HomeCatalog } from '../home-catalog';
import { HomeSpecialties } from './specialties';

describe('HomeSpecialties', () => {
  let fixture: ComponentFixture<HomeSpecialties>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([]), HomeCatalog],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomeSpecialties);
    fixture.detectChanges();
  });

  afterEach(() => http.match(() => true));

  async function respond(techniques: unknown[], specialties: unknown[]): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/techniques`).flush(techniques);
    http.expectOne(`${TEST_API_BASE}/specialties`).flush(specialties);
    await Promise.resolve();
    await fixture.whenStable();
  }

  const technique = (id: string, name: string, specialty: string) => ({
    id,
    name,
    specialty,
    version_number: 1,
  });

  it('es la sección «especialidades», con su titular y el enlace a todo el catálogo', () => {
    const section = root().querySelector('section')!;

    expect(section.id).toBe('especialidades');
    expect(section.getAttribute('aria-labelledby')).toBe('specialties-title');
    expect(root().querySelector('h2')!.textContent).toBe('Técnicas por especialidad.');
    const all = root().querySelector<HTMLAnchorElement>('.head a')!;
    expect(all.textContent!.trim()).toBe('Ver todas las técnicas');
    expect(all.getAttribute('href')).toBe('/tecnicas');
  });

  it('dice «Cargando…» mientras llegan las técnicas', () => {
    expect(root().querySelector('.loading')!.textContent).toBe('Cargando…');
    expect(root().querySelectorAll('.column').length).toBe(0);
  });

  it('una columna por especialidad, en el orden de la API, con sus técnicas', async () => {
    await respond(
      [
        technique('t-1', 'Prostatectomía', 'Urología'),
        technique('t-2', 'Mastectomía', 'Cirugía general'),
        technique('t-3', 'Tiroidectomía', 'Cirugía general'),
      ],
      [
        { id: 'e-1', name: 'Cirugía general' },
        { id: 'e-2', name: 'Urología' },
      ],
    );

    expect(root().querySelector('.loading')).toBeNull();
    const columns = Array.from(root().querySelectorAll('.column')).map((column) => [
      column.querySelector('h3')!.textContent,
      Array.from(column.querySelectorAll('li a span')).map((name) => name.textContent),
    ]);
    expect(columns).toEqual([
      ['Cirugía general', ['Mastectomía', 'Tiroidectomía']],
      ['Urología', ['Prostatectomía']],
    ]);
  });

  it('cada técnica lleva a su detalle, por su id', async () => {
    await respond([technique('t-9', 'Cesárea', 'Ginecología')], [{ id: 'e', name: 'Ginecología' }]);

    const link = root().querySelector<HTMLAnchorElement>('.column li a')!;
    expect(link.getAttribute('href')).toBe('/tecnicas/t-9');
    expect(link.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('si la API falla, no queda «Cargando…» ni columnas', async () => {
    http
      .expectOne(`${TEST_API_BASE}/techniques`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne(`${TEST_API_BASE}/specialties`).flush([]);
    await Promise.resolve();
    await fixture.whenStable();

    expect(root().querySelector('.loading')).toBeNull();
    expect(root().querySelectorAll('.column').length).toBe(0);
  });
});

import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { Home } from './home';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRepositoryTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
  });

  afterEach(() => http.match(() => true));

  it('tiene las seis secciones del inicio, en orden', () => {
    expect(Array.from(root().querySelectorAll('section')).map((s) => s.id)).toEqual([
      'inicio',
      'camino',
      'especialidades',
      'investigacion',
      'quien',
      'preguntas',
    ]);
  });

  it('tiene las secciones a las que enlazan la barra y el pie', () => {
    for (const id of ['camino', 'investigacion', 'quien', 'preguntas']) {
      expect(root().querySelector(`section#${id}`), id).not.toBeNull();
    }
  });

  it('cada sección se anuncia con su titular', () => {
    for (const section of Array.from(root().querySelectorAll('section'))) {
      const titleId = section.getAttribute('aria-labelledby')!;
      expect(section.querySelector(`#${titleId}`), section.id).not.toBeNull();
    }
  });

  it('pide las técnicas y las especialidades una sola vez para toda la página', () => {
    expect(http.match(`${TEST_API_BASE}/techniques`).length).toBe(1);
    expect(http.match(`${TEST_API_BASE}/specialties`).length).toBe(1);
  });

  it('no muestra cifras del catálogo ni nombra la institución', async () => {
    const text = root().textContent!;

    expect(text).not.toMatch(/Rafael N[uú]ñez|CURN|\b\d+ t[eé]cnicas\b/);
  });
});

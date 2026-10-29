import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { handledByRouter } from '../testing';
import { Footer } from './footer';

@Component({ template: '' })
class Blank {}

describe('Footer', () => {
  let fixture: ComponentFixture<Footer>;
  let http: HttpTestingController;

  const root = () => fixture.nativeElement as HTMLElement;
  const column = (title: string) =>
    Array.from(root().querySelectorAll('.columns > div')).find(
      (c) => c.querySelector('.title')!.textContent === title,
    )!;
  const links = (title: string) =>
    Array.from(column(title).querySelectorAll('a')).map((a) => [
      a.textContent!.trim(),
      a.getAttribute('href'),
    ]);

  async function flushSpecialties(): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/specialties`).flush([
      { id: 'e-1', name: 'Cirugía general' },
      { id: 'e-2', name: 'Urología' },
    ]);
    await Promise.resolve();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([{ path: '**', component: Blank }])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();
  });

  // Algunas pruebas no responden las especialidades.
  afterEach(() => http.match(() => true));

  it('lleva la marca al inicio con su frase', () => {
    const brand = root().querySelector<HTMLAnchorElement>('.brand-link')!;

    expect(brand.getAttribute('href')).toBe('/');
    expect(brand.textContent!.trim()).toBe('IQ Platform');
    expect(root().querySelector('.brand p')!.textContent!.trim()).toBe(
      'Herramientas para estudiar la distribución del instrumental quirúrgico, técnica por técnica.',
    );
  });

  it('tiene las cuatro columnas de la barra, en orden', () => {
    expect(Array.from(root().querySelectorAll('.title')).map((t) => t.textContent)).toEqual([
      'Herramientas',
      'Especialidades',
      '¿Por qué IQ Platform?',
      'Ayuda',
    ]);
    expect(root().querySelector('nav')!.getAttribute('aria-label')).toBe('Pie de página');
  });

  it('Herramientas lleva a DataIQ y a los otros dos módulos con navegación completa', () => {
    expect(links('Herramientas')).toEqual([
      ['DataIQ', '/tecnicas'],
      ['SIMIQ3D', '/simiq3d/'],
      ['SIVRI', '/sivri/'],
    ]);
  });

  it('DataIQ se abre por el router; SIMIQ3D y SIVRI, con navegación completa', () => {
    const anchors = Array.from(column('Herramientas').querySelectorAll('a'));

    expect(anchors.map(handledByRouter)).toEqual([true, false, false]);
  });

  it('¿Por qué IQ Platform? lleva a las secciones del inicio, sin «Quiénes somos»', () => {
    expect(links('¿Por qué IQ Platform?')).toEqual([
      ['Cómo funciona', '/#camino'],
      ['La investigación', '/#investigacion'],
    ]);
  });

  it('Ayuda lleva a las preguntas y a quienes enseñan, sin «Términos de uso»', () => {
    expect(links('Ayuda')).toEqual([
      ['Preguntas frecuentes', '/#preguntas'],
      ['Para docentes', '/#quien'],
    ]);
  });

  it('Especialidades dice «Cargando…» y luego lista cada una con su id', async () => {
    expect(column('Especialidades').querySelector('.loading')!.textContent).toBe('Cargando…');
    expect(links('Especialidades')).toEqual([]);

    await flushSpecialties();

    expect(column('Especialidades').querySelector('.loading')).toBeNull();
    expect(links('Especialidades')).toEqual([
      ['Cirugía general', '/tecnicas?especialidad=e-1'],
      ['Urología', '/tecnicas?especialidad=e-2'],
    ]);
  });

  it('si la API falla deja de decir «Cargando…» y la columna queda vacía', async () => {
    http
      .expectOne(`${TEST_API_BASE}/specialties`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await Promise.resolve();
    await fixture.whenStable();

    expect(column('Especialidades').querySelector('.loading')).toBeNull();
    expect(links('Especialidades')).toEqual([]);
  });

  it('si fallaron, las vuelve a pedir al cambiar de página', async () => {
    http
      .expectOne(`${TEST_API_BASE}/specialties`)
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    await Promise.resolve();
    await fixture.whenStable();

    await TestBed.inject(Router).navigateByUrl('/tecnicas');
    TestBed.tick();
    await flushSpecialties();

    expect(links('Especialidades')).toEqual([
      ['Cirugía general', '/tecnicas?especialidad=e-1'],
      ['Urología', '/tecnicas?especialidad=e-2'],
    ]);
  });

  it('cierra con el derecho de autor y la nota del nombre provisional', () => {
    expect(Array.from(root().querySelectorAll('.base span')).map((s) => s.textContent)).toEqual([
      '© 2026 IQ Platform',
      'IQ Platform es un nombre provisional.',
    ]);
  });
});

import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { MobileMenu } from './mobile-menu';

@Component({ template: '' })
class Blank {}

describe('MobileMenu', () => {
  let fixture: ComponentFixture<MobileMenu>;
  let http: HttpTestingController;

  const root = () => fixture.nativeElement as HTMLElement;
  const groups = () => Array.from(root().querySelectorAll('details'));
  const summary = (group: Element) => group.querySelector('summary')!.textContent!.trim();
  const links = (group: Element) =>
    Array.from(group.querySelectorAll('a')).map((a) => [
      a.textContent!.trim(),
      a.getAttribute('href'),
    ]);

  async function flushSpecialties(): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/specialties`).flush([
      { id: 'e-1', name: 'Cirugía general' },
      { id: 'e-2', name: 'Urología' },
    ]);
    http.expectOne(`${TEST_API_BASE}/techniques`).flush([]);
    await Promise.resolve();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([{ path: '**', component: Blank }])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MobileMenu);
    fixture.detectChanges();
  });

  // Abrir el menú pide las especialidades; no todas las pruebas responden.
  afterEach(() => http.match(() => true));

  it('es la navegación «Menú»', () => {
    expect(root().getAttribute('role')).toBe('navigation');
    expect(root().getAttribute('aria-label')).toBe('Menú');
    expect(root().id).toBe('mobile-menu');
  });

  it('tiene un grupo plegable por menú de la barra, todos cerrados', () => {
    expect(groups().map(summary)).toEqual([
      'Herramientas',
      'Especialidades',
      '¿Por qué IQ Platform?',
      'Ayuda',
    ]);
    expect(groups().every((g) => !g.open)).toBe(true);
  });

  it('las opciones llevan a los mismos destinos que los desplegables', () => {
    const [tools, , why, help] = groups();

    expect(links(tools)).toEqual([
      ['DataIQ', '/tecnicas'],
      ['SIMIQ3D', '/simiq3d/'],
      ['SIVRI', '/sivri/'],
    ]);
    expect(links(why)).toEqual([
      ['Cómo funciona', '/#camino'],
      ['La investigación', '/#investigacion'],
    ]);
    expect(links(help)).toEqual([
      ['Preguntas frecuentes', '/#preguntas'],
      ['Guía para estudiantes', '/#quien'],
      ['Para docentes', '/#quien'],
    ]);
  });

  it('Especialidades dice «Cargando…» y luego lista el catálogo y cada especialidad', async () => {
    const specialties = groups()[1];
    expect(specialties.querySelector('.loading')!.textContent).toBe('Cargando…');
    expect(links(specialties)).toEqual([['Ver todas las técnicas', '/tecnicas']]);

    await flushSpecialties();

    expect(specialties.querySelector('.loading')).toBeNull();
    expect(links(specialties)).toEqual([
      ['Ver todas las técnicas', '/tecnicas'],
      ['Cirugía general', '/tecnicas?especialidad=e-1'],
      ['Urología', '/tecnicas?especialidad=e-2'],
    ]);
  });

  it('avisa con `chosen` al tocar un enlace y no al tocar un grupo', () => {
    let chosen = 0;
    fixture.componentInstance.chosen.subscribe(() => chosen++);

    groups()[0].querySelector('summary')!.click();
    expect(chosen).toBe(0);

    groups()[0].querySelector('a')!.click();
    expect(chosen).toBe(1);
  });
});

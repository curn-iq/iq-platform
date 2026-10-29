import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import type { Role } from '../../domain/role';
import { handledByRouter } from '../testing';
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

  it('DataIQ se abre por el router; SIMIQ3D y SIVRI, con navegación completa', () => {
    const anchors = Array.from(groups()[0].querySelectorAll('a'));

    expect(anchors.map(handledByRouter)).toEqual([true, false, false]);
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

  it('si las especialidades fallaron, abrirlo de nuevo las vuelve a pedir', async () => {
    http
      .expectOne(`${TEST_API_BASE}/specialties`)
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    http.expectOne(`${TEST_API_BASE}/techniques`).flush([]);
    await Promise.resolve();
    await fixture.whenStable();
    fixture.destroy();

    fixture = TestBed.createComponent(MobileMenu);
    fixture.detectChanges();
    http.expectOne(`${TEST_API_BASE}/specialties`).flush([{ id: 'e-1', name: 'Urología' }]);
    await Promise.resolve();
    await fixture.whenStable();

    expect(links(groups()[1])).toEqual([
      ['Ver todas las técnicas', '/tecnicas'],
      ['Urología', '/tecnicas?especialidad=e-1'],
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

  describe('sesión', () => {
    const actions = () => root().querySelector('.actions');
    const actionLinks = () =>
      Array.from(actions()?.querySelectorAll('a') ?? []).map((a) => [
        a.textContent!.trim(),
        a.getAttribute('href'),
      ]);

    async function loadSession(role: Role | null): Promise<void> {
      const session = TestBed.inject(SessionService);
      const loading = session.load();
      const request = http.expectOne(`${TEST_API_BASE}/auth/me`);
      if (role) {
        request.flush({ id: 'u-1', name: 'Daniela Ortiz', email: 'd@correo.com', role });
      } else {
        request.flush(null, { status: 401, statusText: 'Unauthorized' });
      }
      await loading;
      fixture.detectChanges();
    }

    it('hasta saber si hay sesión no muestra acciones', () => {
      expect(actions()).toBeNull();
    });

    it('a un visitante le ofrece Crear cuenta gratis (grande) e Ingresar', async () => {
      await loadSession(null);

      expect(actionLinks()).toEqual([
        ['Crear cuenta gratis', '/cuenta/crear'],
        ['Ingresar', '/cuenta/ingresar'],
      ]);
      expect(actions()!.querySelector('a')!.getAttribute('data-size')).toBe('large');
      expect(actions()!.querySelector('.who')).toBeNull();
    });

    it('con sesión dice quién es y lista los accesos de su rol', async () => {
      await loadSession('reviewer');

      expect(actions()!.querySelector('.who')!.textContent).toBe('Daniela Ortiz · Revisor');
      expect(actionLinks()).toEqual([
        ['Mis borradores', '/gestion/borradores'],
        ['Por revisar', '/gestion/revision'],
        ['Instrumental', '/gestion/instrumental'],
      ]);
    });

    it('un usuario sin gestión solo ve quién es', async () => {
      await loadSession('user');

      expect(actions()!.querySelector('.who')!.textContent).toBe('Daniela Ortiz · Usuario');
      expect(actionLinks()).toEqual([]);
    });
  });
});

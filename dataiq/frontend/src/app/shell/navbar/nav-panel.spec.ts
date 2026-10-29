import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { NAV_MENUS, NavMenuId } from './nav-menus';
import { NavPanel } from './nav-panel';

@Component({ template: '' })
class Blank {}

describe('NavPanel', () => {
  let fixture: ComponentFixture<NavPanel>;
  let http: HttpTestingController;

  const root = () => fixture.nativeElement as HTMLElement;
  const texts = (selector: string) =>
    Array.from(root().querySelectorAll(selector)).map((e) => e.textContent!.trim());
  const links = () => Array.from(root().querySelectorAll<HTMLAnchorElement>('.list a'));

  async function open(id: NavMenuId): Promise<void> {
    fixture = TestBed.createComponent(NavPanel);
    fixture.componentRef.setInput(
      'menu',
      NAV_MENUS.find((m) => m.id === id)!,
    );
    fixture.detectChanges();
    // Sin `whenStable`: Especialidades tiene peticiones que la prueba responde después.
    await Promise.resolve();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([{ path: '**', component: Blank }])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('es una región con el nombre del menú', async () => {
    await open('help');

    expect(root().getAttribute('role')).toBe('region');
    expect(root().getAttribute('aria-label')).toBe('Ayuda');
    expect(root().id).toBe('nav-panel');
  });

  describe('Herramientas', () => {
    beforeEach(() => open('tools'));

    it('dice su nombre y su línea', () => {
      expect(texts('.name')).toEqual(['Herramientas']);
      expect(texts('.line')).toEqual(['Tres formas de recorrer cada técnica.']);
    });

    it('lista las tres herramientas: DataIQ en esta app, las otras con navegación completa', () => {
      expect(
        links().map((a) => [a.querySelector('strong')!.textContent, a.getAttribute('href')]),
      ).toEqual([
        ['DataIQ', '/tecnicas'],
        ['SIMIQ3D', '/simiq3d/'],
        ['SIVRI', '/sivri/'],
      ]);
    });

    it('muestra la herramienta señalada, y la primera si no se señaló ninguna', async () => {
      expect(texts('.tool-name')).toEqual(['DataIQ']);
      expect(texts('.rows li')).toEqual([
        'Buscar por nombre o especialidad',
        'Mesa de Mayo y de reserva, pieza por pieza',
        'Datos clínicos, suturas y equipos',
      ]);

      links()[2].dispatchEvent(new MouseEvent('mouseenter'));
      await fixture.whenStable();

      expect(texts('.tool-name')).toEqual(['SIVRI']);
      expect(texts('.rows li')[0]).toBe('Reconoce el instrumental en tiempo real');
      expect(links()[2].classList).toContain('pointed');
    });

    it('señalar con el teclado también cambia la vista previa', async () => {
      links()[1].dispatchEvent(new FocusEvent('focus'));
      await fixture.whenStable();

      expect(texts('.tool-name')).toEqual(['SIMIQ3D']);
    });

    it('no pide nada a la API', () => {
      http.expectNone(() => true);
    });
  });

  describe('Especialidades', () => {
    const SPECIALTIES = [
      { id: 'e-1', name: 'Cirugía general' },
      { id: 'e-2', name: 'Urología' },
    ];
    const TECHNIQUES = [
      { id: 't-1', name: 'Mastectomía', specialty: 'Cirugía general', version_number: 1 },
      { id: 't-2', name: 'Tiroidectomía', specialty: 'Cirugía general', version_number: 1 },
      { id: 't-3', name: 'Colecistectomía', specialty: 'Cirugía general', version_number: 1 },
      { id: 't-4', name: 'Prostatectomía', specialty: 'Urología', version_number: 1 },
    ];

    beforeEach(async () => {
      await open('specialties');
      http.expectOne(`${TEST_API_BASE}/specialties`).flush(SPECIALTIES);
      http.expectOne(`${TEST_API_BASE}/techniques`).flush(TECHNIQUES);
      await Promise.resolve();
      await fixture.whenStable();
    });

    it('ofrece ver todas las técnicas', () => {
      const link = root().querySelector<HTMLAnchorElement>('.link')!;

      expect(link.textContent!.trim()).toBe('Ver todas las técnicas');
      expect(link.getAttribute('href')).toBe('/tecnicas');
    });

    it('lista cada especialidad con su id en el enlace y sus primeras técnicas', () => {
      expect(links().map((a) => a.getAttribute('href'))).toEqual([
        '/tecnicas?especialidad=e-1',
        '/tecnicas?especialidad=e-2',
      ]);
      expect(texts('.list strong')).toEqual(['Cirugía general', 'Urología']);
      // Más de dos técnicas llevan puntos suspensivos; con una sola, no.
      expect(texts('.list a span span')).toEqual(['Mastectomía, Tiroidectomía…', 'Prostatectomía']);
    });

    it('la vista previa lista las técnicas de la especialidad señalada', async () => {
      expect(texts('.view-title')).toEqual(['Cirugía general']);
      expect(texts('.rows li')).toEqual(['Mastectomía', 'Tiroidectomía', 'Colecistectomía']);

      links()[1].dispatchEvent(new MouseEvent('mouseenter'));
      await fixture.whenStable();

      expect(texts('.view-title')).toEqual(['Urología']);
      expect(texts('.rows li')).toEqual(['Prostatectomía']);
    });
  });

  describe('¿Por qué IQ Platform?', () => {
    beforeEach(() => open('why'));

    it('lleva a las secciones del inicio, sin «Quiénes somos»', () => {
      expect(texts('.list strong')).toEqual(['Cómo funciona', 'La investigación']);
      expect(links().map((a) => a.getAttribute('href'))).toEqual(['/#camino', '/#investigacion']);
    });

    it('muestra la frase con el final en acento', () => {
      expect(texts('.phrase')).toEqual(['Con respuesta inmediata, se aprende antes.']);
      expect(texts('.phrase em')).toEqual(['se aprende antes.']);
    });

    it('no pide nada a la API', () => {
      http.expectNone(() => true);
    });
  });

  describe('Ayuda', () => {
    beforeEach(() => open('help'));

    it('lleva a las preguntas y al perfil de quien estudia y de quien enseña', () => {
      expect(texts('.list strong')).toEqual([
        'Preguntas frecuentes',
        'Guía para estudiantes',
        'Para docentes',
      ]);
      expect(links().map((a) => a.getAttribute('href'))).toEqual([
        '/#preguntas',
        '/#quien',
        '/#quien',
      ]);
    });

    it('muestra lo más preguntado', () => {
      expect(texts('.view-title')).toEqual(['Lo más preguntado']);
      expect(texts('.rows li')).toEqual([
        '¿Cuánto cuesta?',
        '¿Sirve si estudio en otra universidad?',
        '¿Por cuál herramienta empiezo?',
      ]);
    });
  });

  describe('elegir una opción', () => {
    it('avisa con `chosen` al tocar una opción o el enlace del encabezado', async () => {
      await open('specialties');
      http.expectOne(`${TEST_API_BASE}/specialties`).flush([{ id: 'e-1', name: 'Urología' }]);
      http.expectOne(`${TEST_API_BASE}/techniques`).flush([]);
      await Promise.resolve();
      await fixture.whenStable();
      let chosen = 0;
      fixture.componentInstance.chosen.subscribe(() => chosen++);

      root().querySelector<HTMLAnchorElement>('.link')!.click();
      links()[0].click();

      expect(chosen).toBe(2);
    });

    it('no avisa si el clic fue en otro lado', async () => {
      await open('why');
      let chosen = 0;
      fixture.componentInstance.chosen.subscribe(() => chosen++);

      root().querySelector<HTMLElement>('.name')!.click();
      root().querySelector<HTMLElement>('.phrase')!.click();

      expect(chosen).toBe(0);
    });
  });
});

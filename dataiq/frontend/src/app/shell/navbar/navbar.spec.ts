import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideRepositoryTesting } from '../../data/testing';
import { Navbar } from './navbar';

@Component({ template: '' })
class Blank {}

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let router: Router;
  let http: HttpTestingController;

  const root = () => fixture.nativeElement as HTMLElement;
  const button = (id: string) => root().querySelector<HTMLButtonElement>(`[data-menu="${id}"]`)!;
  const panels = () => Array.from(document.querySelectorAll<HTMLElement>('app-nav-panel'));
  const panelNames = () => panels().map((p) => p.getAttribute('aria-label'));
  /** Un clic de ratón (con teclado, `detail` es 0). */
  const mouseClick = (target: HTMLElement) =>
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  const opened = (name: string) => vi.waitFor(() => expect(panelNames()).toEqual([name]));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([{ path: '**', component: Blank }])],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
  });

  // Abrir «Especialidades» pide las especialidades y las técnicas; aquí no importa la respuesta.
  afterEach(() => http.match(() => true));

  it('lleva la marca al inicio y los cuatro menús en orden', () => {
    const brand = root().querySelector<HTMLAnchorElement>('.brand')!;

    expect(brand.getAttribute('href')).toBe('/');
    expect(brand.getAttribute('aria-label')).toBe('IQ Platform, inicio');
    expect(
      Array.from(root().querySelectorAll('nav button')).map((b) => b.textContent!.trim()),
    ).toEqual(['Herramientas', 'Especialidades', '¿Por qué IQ Platform?', 'Ayuda']);
    expect(root().querySelector('nav')!.getAttribute('aria-label')).toBe('Principal');
  });

  it('empieza con todo cerrado', () => {
    expect(panels()).toEqual([]);
    for (const b of root().querySelectorAll('nav button')) {
      expect(b.getAttribute('aria-expanded')).toBe('false');
      expect(b.hasAttribute('aria-controls')).toBe(false);
    }
  });

  describe('abrir', () => {
    it('un clic abre el desplegable del botón y lo marca como abierto', async () => {
      mouseClick(button('tools'));
      await opened('Herramientas');
      await fixture.whenStable();

      expect(button('tools').getAttribute('aria-expanded')).toBe('true');
      expect(button('tools').getAttribute('aria-controls')).toBe('nav-panel');
      expect(panels()[0].id).toBe('nav-panel');
    });

    it('solo hay un desplegable abierto a la vez', async () => {
      mouseClick(button('tools'));
      await opened('Herramientas');

      mouseClick(button('help'));
      await opened('Ayuda');
      await fixture.whenStable();

      expect(button('tools').getAttribute('aria-expanded')).toBe('false');
      expect(button('help').getAttribute('aria-expanded')).toBe('true');
    });

    it('con el teclado, el foco entra al desplegable; con el ratón, no', async () => {
      button('why').click();
      await opened('¿Por qué IQ Platform?');
      expect(panels()[0].contains(document.activeElement)).toBe(true);

      button('why').click();
      mouseClick(button('help'));
      await opened('Ayuda');
      expect(panels()[0].contains(document.activeElement)).toBe(false);
    });

    it('un clic doble y rápido no deja un desplegable abierto', async () => {
      mouseClick(button('tools'));
      mouseClick(button('tools'));
      mouseClick(button('help'));

      await opened('Ayuda');
      expect(panels()).toHaveLength(1);
    });
  });

  describe('cerrar', () => {
    beforeEach(async () => {
      mouseClick(button('tools'));
      await opened('Herramientas');
    });

    it('un segundo clic sobre el mismo botón lo cierra', async () => {
      mouseClick(button('tools'));
      await fixture.whenStable();

      expect(panels()).toEqual([]);
      expect(button('tools').getAttribute('aria-expanded')).toBe('false');
      expect(router.url).toBe('/');
    });

    it('Escape lo cierra y devuelve el foco a su botón', async () => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();

      expect(panels()).toEqual([]);
      expect(button('tools').getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(button('tools'));
    });

    it('otra tecla no lo cierra', () => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(panelNames()).toEqual(['Herramientas']);
    });

    it('un clic fuera lo cierra', async () => {
      document.body.click();
      await fixture.whenStable();

      expect(panels()).toEqual([]);
      expect(button('tools').getAttribute('aria-expanded')).toBe('false');
    });

    it('un clic dentro del desplegable, fuera de una opción, no lo cierra', () => {
      panels()[0].querySelector<HTMLElement>('.name')!.click();

      expect(panelNames()).toEqual(['Herramientas']);
    });

    it('elegir una opción lo cierra y lleva a su destino', async () => {
      panels()[0].querySelector<HTMLAnchorElement>('.list a')!.click();
      await fixture.whenStable();
      await vi.waitFor(() => expect(router.url).toBe('/tecnicas'));

      expect(panels()).toEqual([]);
      expect(button('tools').getAttribute('aria-expanded')).toBe('false');
    });

    it('al destruir la barra, el desplegable se va con ella', () => {
      fixture.destroy();

      expect(panels()).toEqual([]);
    });
  });

  describe('Especialidades', () => {
    it('un clic abre el desplegable y un segundo clic lleva al catálogo', async () => {
      mouseClick(button('specialties'));
      await opened('Especialidades');

      mouseClick(button('specialties'));
      await vi.waitFor(() => expect(router.url).toBe('/tecnicas'));

      expect(panels()).toEqual([]);
    });
  });

  describe('sección actual', () => {
    const current = () =>
      Array.from(root().querySelectorAll('nav button'))
        .filter((b) => b.getAttribute('aria-current') === 'page')
        .map((b) => b.textContent!.trim());

    it('Especialidades es la actual en el catálogo y en el detalle de técnica', async () => {
      expect(current()).toEqual([]);

      await router.navigateByUrl('/tecnicas?especialidad=e-1');
      await fixture.whenStable();
      expect(current()).toEqual(['Especialidades']);

      await router.navigateByUrl('/tecnicas/abc/instrumental');
      await fixture.whenStable();
      expect(current()).toEqual(['Especialidades']);
    });

    it('en otras páginas no hay sección actual', async () => {
      await router.navigateByUrl('/tecnicas');
      await router.navigateByUrl('/gestion/borradores');
      await fixture.whenStable();

      expect(current()).toEqual([]);
    });
  });
});

import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionService } from '../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import type { Role } from '../../domain/role';
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

  /** Quienes escuchan cada consulta de `matchMedia`, que jsdom no trae. */
  let mediaListeners: Map<string, ((event: { matches: boolean }) => void)[]>;
  /** Las consultas que se cumplen (ninguna al empezar: una ventana entre 761 y 960 px). */
  let mediaMatches: Set<string>;
  const listeners = (query: string) => mediaListeners.get(query) ?? [];
  /** La ventana cambia de ancho y `query` pasa a cumplirse o a dejar de cumplirse. */
  const changeMedia = (query: string, matches: boolean) => {
    if (matches) mediaMatches.add(query);
    else mediaMatches.delete(query);
    listeners(query).forEach((listener) => listener({ matches }));
  };
  const WIDE = '(min-width: 961px)';
  const COMPACT = '(max-width: 760px)';
  /** Una tecla sobre lo que tiene el foco; dice si se canceló lo que haría el navegador. */
  const press = (key: string, options: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    (document.activeElement ?? document.body).dispatchEvent(event);
    return event.defaultPrevented;
  };
  const mobileButton = () => root().querySelector<HTMLButtonElement>('.mobile-button')!;
  const mobileMenu = () => document.querySelector('app-mobile-menu');

  beforeEach(async () => {
    mediaListeners = new Map();
    mediaMatches = new Set();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: mediaMatches.has(query),
      addEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
        mediaListeners.set(query, [...listeners(query), listener]),
      removeEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
        mediaListeners.set(
          query,
          listeners(query).filter((l) => l !== listener),
        ),
    }));
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([{ path: '**', component: Blank }])],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
  });

  // Abrir «Especialidades» pide las especialidades y las técnicas; aquí no importa la respuesta.
  afterEach(() => {
    http.match(() => true);
    vi.unstubAllGlobals();
  });

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

    it('cambiar de página sin pasar por él (Atrás, un guard) lo cierra', async () => {
      await router.navigateByUrl('/otra');
      await fixture.whenStable();

      expect(panels()).toEqual([]);
      expect(button('tools').getAttribute('aria-expanded')).toBe('false');
    });

    it('si la ventana se angosta y su botón se esconde, se cierra', async () => {
      changeMedia(WIDE, false);
      await fixture.whenStable();

      expect(panels()).toEqual([]);
    });

    it('al destruir la barra, el desplegable se va con ella', () => {
      fixture.destroy();

      expect(panels()).toEqual([]);
    });
  });

  describe('foco', () => {
    const optionLinks = () => Array.from(panels()[0].querySelectorAll<HTMLAnchorElement>('a'));

    beforeEach(async () => {
      button('help').click();
      await opened('Ayuda');
    });

    it('Mayús+Tab desde la primera opción cierra el desplegable y vuelve a su botón', async () => {
      expect(document.activeElement).toBe(optionLinks()[0]);

      expect(press('Tab', { shiftKey: true })).toBe(true);
      await fixture.whenStable();

      expect(panels()).toEqual([]);
      expect(document.activeElement).toBe(button('help'));
    });

    it('Tab desde la última opción lo cierra y sigue desde su botón, como si estuviera detrás de él', async () => {
      optionLinks().at(-1)!.focus();

      // El navegador hace el Tab desde el botón: la prueba solo ve que no se canceló.
      expect(press('Tab')).toBe(false);
      await fixture.whenStable();

      expect(panels()).toEqual([]);
      expect(document.activeElement).toBe(button('help'));
    });

    it('Tab entre opciones no lo cierra', () => {
      expect(press('Tab')).toBe(false);

      expect(panelNames()).toEqual(['Ayuda']);
    });

    it('elegir una opción con el teclado devuelve el foco a su botón', async () => {
      optionLinks()[0].click();
      await fixture.whenStable();

      expect(panels()).toEqual([]);
      expect(document.activeElement).toBe(button('help'));
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

  describe('menú de celular', () => {
    // Sin `whenStable`: al abrir el menú se piden las especialidades y la prueba no las responde.
    const settle = async () => {
      fixture.detectChanges();
      await Promise.resolve();
    };

    it('el botón empieza cerrado y sin menú', () => {
      expect(mobileButton().getAttribute('aria-label')).toBe('Abrir menú');
      expect(mobileButton().getAttribute('aria-expanded')).toBe('false');
      expect(mobileButton().hasAttribute('aria-controls')).toBe(false);
      expect(mobileMenu()).toBeNull();
    });

    it('un clic abre el menú y otro lo cierra', async () => {
      mobileButton().click();
      await settle();

      expect(mobileMenu()).not.toBeNull();
      expect(mobileButton().getAttribute('aria-expanded')).toBe('true');
      expect(mobileButton().getAttribute('aria-label')).toBe('Cerrar menú');
      expect(mobileButton().getAttribute('aria-controls')).toBe('mobile-menu');

      mobileButton().click();
      await settle();

      expect(mobileMenu()).toBeNull();
      expect(mobileButton().getAttribute('aria-expanded')).toBe('false');
    });

    it('Escape lo cierra y devuelve el foco al botón', async () => {
      // El botón solo se ve por debajo de 960 px, y jsdom no da el foco a lo que no se ve.
      mobileButton().style.display = 'inline-grid';
      mobileButton().click();
      await settle();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();

      expect(mobileMenu()).toBeNull();
      expect(document.activeElement).toBe(mobileButton());
    });

    it('elegir una opción lo cierra', async () => {
      mobileButton().click();
      await settle();

      mobileMenu()!.querySelector<HTMLAnchorElement>('details a')!.click();
      await settle();

      expect(mobileMenu()).toBeNull();
    });

    it('si el foco estaba en el menú, al cerrarse vuelve al botón', async () => {
      mobileButton().style.display = 'inline-grid';
      mobileButton().click();
      await settle();

      const link = mobileMenu()!.querySelector<HTMLAnchorElement>('details a')!;
      link.focus();
      link.click();
      await settle();

      expect(mobileMenu()).toBeNull();
      expect(document.activeElement).toBe(mobileButton());
    });

    it('cambiar de página sin pasar por él lo cierra', async () => {
      mobileButton().click();
      await settle();

      await router.navigateByUrl('/otra');
      await settle();

      expect(mobileMenu()).toBeNull();
    });

    it('al abrirlo cierra el desplegable que hubiera, y al abrir un desplegable cierra el menú', async () => {
      mouseClick(button('help'));
      await opened('Ayuda');

      mobileButton().click();
      await settle();
      expect(panels()).toEqual([]);
      expect(mobileMenu()).not.toBeNull();

      mouseClick(button('tools'));
      await opened('Herramientas');
      expect(mobileMenu()).toBeNull();
    });

    it('si la ventana se ensancha por encima de 960 px, el menú se cierra', async () => {
      mobileButton().click();
      await settle();

      changeMedia(WIDE, true);
      await settle();

      expect(mobileMenu()).toBeNull();
    });

    it('al destruir la barra deja de escuchar el ancho de la ventana', () => {
      expect(listeners(WIDE)).toHaveLength(1);
      expect(listeners(COMPACT)).toHaveLength(1);

      fixture.destroy();

      expect(listeners(WIDE)).toHaveLength(0);
      expect(listeners(COMPACT)).toHaveLength(0);
    });
  });

  describe('sesión', () => {
    const account = () => root().querySelector<HTMLButtonElement>('.account');
    const accountMenu = () => document.querySelector('app-account-menu');
    const actionLinks = () =>
      Array.from(root().querySelectorAll<HTMLAnchorElement>('.actions a')).map((a) => [
        a.textContent!.trim(),
        a.getAttribute('href'),
      ]);

    /** Responde `GET /auth/me` con una cuenta del rol, o con un 401 si es un visitante. */
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

    it('hasta saber si hay sesión no muestra ni Ingresar ni «Mi cuenta»', () => {
      expect(actionLinks()).toEqual([]);
      expect(account()).toBeNull();
    });

    it('a un visitante le ofrece Ingresar y Crear cuenta', async () => {
      await loadSession(null);

      expect(actionLinks()).toEqual([
        ['Ingresar', '/cuenta/ingresar'],
        ['Crear cuenta', '/cuenta/crear'],
      ]);
      expect(account()).toBeNull();
    });

    it('con sesión muestra «Mi cuenta» con las iniciales y no Ingresar', async () => {
      await loadSession('contributor');

      expect(actionLinks()).toEqual([]);
      expect(account()!.textContent).toContain('Mi cuenta');
      expect(account()!.querySelector('app-avatar')!.textContent).toBe('DO');
      expect(account()!.getAttribute('aria-expanded')).toBe('false');
    });

    it('«Mi cuenta» abre el panel con los accesos del rol y lo marca como abierto', async () => {
      await loadSession('reviewer');

      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());

      expect(account()!.getAttribute('aria-expanded')).toBe('true');
      expect(account()!.getAttribute('aria-controls')).toBe('account-menu');
      expect(
        Array.from(accountMenu()!.querySelectorAll('.links a')).map((a) => a.textContent!.trim()),
      ).toEqual(['Mis borradores', 'Por revisar', 'Instrumental']);
    });

    it('un segundo clic, Escape y un clic fuera lo cierran', async () => {
      await loadSession('contributor');
      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());

      mouseClick(account()!);
      await fixture.whenStable();
      expect(accountMenu()).toBeNull();

      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();
      expect(accountMenu()).toBeNull();
      expect(document.activeElement).toBe(account());

      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());
      document.body.click();
      await fixture.whenStable();
      expect(accountMenu()).toBeNull();
    });

    it('elegir un acceso cierra el panel y lleva a su pantalla', async () => {
      await loadSession('contributor');
      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());

      accountMenu()!.querySelector<HTMLAnchorElement>('.links a')!.click();
      await vi.waitFor(() => expect(router.url).toBe('/gestion/borradores'));

      expect(accountMenu()).toBeNull();
    });

    it('solo hay un panel abierto: «Mi cuenta» cierra el desplegable y al revés', async () => {
      await loadSession('contributor');
      mouseClick(button('help'));
      await opened('Ayuda');

      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());
      expect(panels()).toEqual([]);
      expect(button('help').getAttribute('aria-expanded')).toBe('false');

      mouseClick(button('tools'));
      await opened('Herramientas');
      expect(accountMenu()).toBeNull();
      expect(account()!.getAttribute('aria-expanded')).toBe('false');
    });

    it('con el teclado, el foco entra al panel de «Mi cuenta»', async () => {
      await loadSession('contributor');

      account()!.click();
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());

      expect(accountMenu()!.contains(document.activeElement)).toBe(true);
    });

    it('se ancla bajo la barra, que es más baja por debajo de 760 px', async () => {
      const pane = () => accountMenu()!.closest<HTMLElement>('.cdk-overlay-pane')!;
      await loadSession('contributor');

      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());
      expect(pane().style.marginTop).toBe('calc(var(--size-navbar) - 4px)');

      changeMedia(COMPACT, true);
      await fixture.whenStable();
      // Al cambiar la altura de la barra se cierra: al abrirlo de nuevo toma la nueva.
      expect(accountMenu()).toBeNull();

      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());
      expect(pane().style.marginTop).toBe('calc(var(--size-navbar-mobile) - 4px)');
    });

    it('angostar la ventana por debajo de 961 px no lo cierra: «Mi cuenta» sigue en la barra', async () => {
      await loadSession('contributor');
      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());

      changeMedia(WIDE, false);
      await fixture.whenStable();

      expect(accountMenu()).not.toBeNull();
    });

    it('si la sesión se pierde (p. ej. vence), el panel se cierra', async () => {
      await loadSession('admin');
      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());

      TestBed.inject(SessionService).clear();
      await fixture.whenStable();

      expect(accountMenu()).toBeNull();
      expect(account()).toBeNull();
    });

    it('un usuario sin gestión ve su identidad y ningún acceso', async () => {
      await loadSession('user');
      mouseClick(account()!);
      await vi.waitFor(() => expect(accountMenu()).not.toBeNull());

      expect(accountMenu()!.querySelector('.role')!.textContent).toBe('Usuario');
      expect(accountMenu()!.querySelectorAll('.links a')).toHaveLength(0);
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

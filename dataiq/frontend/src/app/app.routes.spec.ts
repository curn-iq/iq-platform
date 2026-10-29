import { HttpTestingController } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { SessionService } from './core/session/session.service';
import { provideTitle } from './core/title/title.providers';
import type { Account } from './data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from './data/testing';
import type { Role } from './domain/role';
import { AccountEntry } from './features/account/account';
import { Catalog } from './features/catalog/catalog';
import { Home } from './features/home/home';
import { Drafts } from './features/management/drafts/drafts';
import { Editor } from './features/management/editor/editor';
import { Instruments } from './features/management/instruments/instruments';
import { Review } from './features/management/review/review';
import { Users } from './features/management/users/users';
import { TechniqueDetail } from './features/technique/technique';

/** Cada ruta, su pantalla y el título de su pestaña. */
const PAGES: readonly [url: string, screen: Type<unknown>, title: string][] = [
  ['/', Home, 'IQ Platform'],
  ['/tecnicas', Catalog, 'Catálogo de técnicas · IQ Platform'],
  ['/tecnicas/abc/datos-clinicos', TechniqueDetail, 'Técnica · IQ Platform'],
  ['/cuenta/ingresar', AccountEntry, 'Ingresar · IQ Platform'],
  ['/cuenta/crear', AccountEntry, 'Crear cuenta · IQ Platform'],
  ['/gestion/borradores', Drafts, 'Mis borradores · IQ Platform'],
  ['/gestion/editor/nueva', Editor, 'Técnica nueva · IQ Platform'],
  ['/gestion/editor/abc/1', Editor, 'Editar técnica · IQ Platform'],
  ['/gestion/revision', Review, 'Por revisar · IQ Platform'],
  ['/gestion/revision/abc', Review, 'Revisar versión · IQ Platform'],
  ['/gestion/instrumental', Instruments, 'Instrumental · IQ Platform'],
  ['/gestion/instrumental/abc', Instruments, 'Instrumental · IQ Platform'],
  ['/gestion/usuarios', Users, 'Usuarios y roles · IQ Platform'],
];

describe('rutas', () => {
  let session: SessionService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideTitle(), provideRouter(routes)],
    });
    session = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  /** Responde `GET /auth/me` con una cuenta del rol, o con un 401 si es un visitante. */
  async function loadSession(role: Role | null): Promise<void> {
    const loading = session.load();
    const request = http.expectOne(`${TEST_API_BASE}/auth/me`);
    if (role) {
      const account: Account = { id: 'u-1', name: 'Ana', email: 'ana@example.com', role };
      request.flush(account);
    } else {
      request.flush(null, { status: 401, statusText: 'Unauthorized' });
    }
    await loading;
  }

  it('todas las pantallas se cargan al visitarlas', () => {
    for (const route of routes) {
      expect(route.component, route.path).toBeUndefined();
      expect(route.loadComponent, route.path).toBeTypeOf('function');
    }
  });

  it('todas las rutas llevan título, menos el inicio', () => {
    for (const route of routes.filter((r) => r.path !== '')) {
      expect(route.title, route.path).toBeTruthy();
    }
  });

  it.each(PAGES)('%s abre su pantalla con el título de la pestaña', async (url, screen, title) => {
    await loadSession('admin');

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(url);

    expect(component).toBeInstanceOf(screen);
    expect(router.url).toBe(url);
    expect(document.title).toBe(title);
  });

  describe('accesos', () => {
    it('la gestión del colaborador pide ser colaborador', async () => {
      await loadSession('user');

      await router.navigateByUrl('/gestion/borradores');

      expect(router.url).toBe('/');
    });

    it('la gestión del revisor pide ser revisor', async () => {
      await loadSession('contributor');

      await router.navigateByUrl('/gestion/instrumental/abc');

      expect(router.url).toBe('/');
    });

    it('los usuarios y roles piden ser admin', async () => {
      await loadSession('reviewer');

      await router.navigateByUrl('/gestion/usuarios');

      expect(router.url).toBe('/');
    });

    it('un visitante entra a lo público y la gestión lo lleva a ingresar', async () => {
      await loadSession(null);

      expect(await router.navigateByUrl('/tecnicas')).toBe(true);
      await router.navigateByUrl('/gestion/revision');

      expect(router.url).toBe('/cuenta/ingresar?volver=%2Fgestion%2Frevision');
      expect(document.title).toBe('Ingresar · IQ Platform');
    });
  });
});

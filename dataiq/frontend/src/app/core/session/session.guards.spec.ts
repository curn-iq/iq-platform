import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Account } from '../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import type { Role } from '../../domain/role';
import { NoticeService } from '../notice/notice.service';
import { roleGuard, sessionGuard } from './session.guards';
import { SessionService } from './session.service';

@Component({ template: '' })
class Blank {}

const account = (role: Role): Account => ({
  id: 'u-1',
  name: 'Ana',
  email: 'ana@example.com',
  role,
});

describe('guards de sesión', () => {
  let router: Router;
  let session: SessionService;
  let http: HttpTestingController;
  let notices: NoticeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([
          { path: '', component: Blank },
          { path: 'cuenta/ingresar', component: Blank },
          { path: 'mi-cuenta', component: Blank, canActivate: [sessionGuard] },
          { path: 'gestion/borradores', component: Blank, canActivate: [roleGuard('contributor')] },
          { path: 'gestion/usuarios', component: Blank, canActivate: [roleGuard('admin')] },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    session = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
    notices = TestBed.inject(NoticeService);
  });

  afterEach(() => http.verify());

  /** Responde `GET /auth/me` con una cuenta del rol, o con un 401 si es un visitante. */
  async function loadSession(role: Role | null): Promise<void> {
    const loading = session.load();
    const request = http.expectOne(`${TEST_API_BASE}/auth/me`);
    if (role) request.flush(account(role));
    else request.flush(null, { status: 401, statusText: 'Unauthorized' });
    await loading;
  }

  describe('sessionGuard', () => {
    it('deja pasar a quien tiene sesión', async () => {
      await loadSession('user');

      expect(await router.navigateByUrl('/mi-cuenta')).toBe(true);
      expect(router.url).toBe('/mi-cuenta');
    });

    it('lleva al visitante a ingresar con la ruta que quería en ?volver=', async () => {
      await loadSession(null);

      await router.navigateByUrl('/mi-cuenta?pestana=datos');

      const url = router.parseUrl(router.url);
      expect(url.root.children['primary'].segments.map((s) => s.path)).toEqual([
        'cuenta',
        'ingresar',
      ]);
      expect(url.queryParams).toEqual({ volver: '/mi-cuenta?pestana=datos' });
    });

    it('si la primera consulta falló (arranque en frío), vuelve a preguntar', async () => {
      const failed = session.load();
      http
        .expectOne(`${TEST_API_BASE}/auth/me`)
        .flush(null, { status: 504, statusText: 'Gateway Timeout' });
      await failed;

      const navigation = router.navigateByUrl('/mi-cuenta');
      const request = await vi.waitFor(() => http.expectOne(`${TEST_API_BASE}/auth/me`));
      request.flush(account('user'));

      expect(await navigation).toBe(true);
      expect(router.url).toBe('/mi-cuenta');
    });

    it('espera a que se sepa si hay sesión antes de decidir', async () => {
      const navigation = router.navigateByUrl('/mi-cuenta');
      const request = await vi.waitFor(() => http.expectOne(`${TEST_API_BASE}/auth/me`));
      // La respuesta aún no llega: no se decidió nada.
      expect(router.url).toBe('/');

      request.flush(account('user'));

      expect(await navigation).toBe(true);
      expect(router.url).toBe('/mi-cuenta');
    });
  });

  describe('roleGuard', () => {
    it('deja pasar a quien tiene el rol', async () => {
      await loadSession('contributor');

      expect(await router.navigateByUrl('/gestion/borradores')).toBe(true);
      expect(notices.notices()).toEqual([]);
    });

    it('deja pasar a un rol mayor (acumulativos)', async () => {
      await loadSession('admin');

      expect(await router.navigateByUrl('/gestion/borradores')).toBe(true);
      expect(router.url).toBe('/gestion/borradores');
    });

    it('lleva al visitante a ingresar con ?volver=', async () => {
      await loadSession(null);

      await router.navigateByUrl('/gestion/borradores');

      expect(router.url).toBe('/cuenta/ingresar?volver=%2Fgestion%2Fborradores');
      expect(notices.notices()).toEqual([]);
    });

    it('a quien tiene sesión pero no alcanza, lo lleva al inicio con el aviso de que no hay permiso', async () => {
      await loadSession('contributor');

      await router.navigateByUrl('/gestion/usuarios');

      expect(router.url).toBe('/');
      expect(notices.notices().map((n) => [n.kind, n.messages])).toEqual([
        ['error', ['No hay permiso para esta acción.']],
      ]);
    });
  });
});

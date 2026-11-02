import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Account } from '../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import type { Role } from '../../domain/role';
import { NoticeService } from '../notice/notice.service';
import { guestGuard, roleGuard, sessionGuard } from './session.guards';
import { SessionService } from './session.service';

@Component({ template: '' })
class Blank {}

const account = (role: Role): Account => ({
  id: 'u-1',
  name: 'Ana',
  email: 'ana@example.com',
  role,
});

const unavailable = { status: 503, statusText: 'Service Unavailable' };

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
          { path: 'tecnicas', component: Blank },
          { path: 'tecnicas/:id', component: Blank },
          { path: 'cuenta/ingresar', component: Blank, canActivate: [guestGuard] },
          { path: 'cuenta/crear', component: Blank, canActivate: [guestGuard] },
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

  const me = () => http.expectOne(`${TEST_API_BASE}/auth/me`);

  /** Responde `GET /auth/me` con una cuenta del rol, o con un 401 si es un visitante. */
  async function loadSession(role: Role | null): Promise<void> {
    const loading = session.load();
    const request = me();
    if (role) request.flush(account(role));
    else request.flush(null, { status: 401, statusText: 'Unauthorized' });
    await loading;
  }

  /** La API no responde: no se sabe si hay sesión. */
  async function failSession(): Promise<void> {
    const loading = session.load();
    me().flush(null, unavailable);
    await loading;
  }

  /** Navega y deja que el guard pregunte; devuelve la navegación y la petición que hizo. */
  async function navigate(url: string) {
    const navigation = router.navigateByUrl(url);
    const request = await vi.waitFor(() => me());
    return { navigation, request };
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
      await failSession();

      const { navigation, request } = await navigate('/mi-cuenta');
      request.flush(account('user'));

      expect(await navigation).toBe(true);
      expect(router.url).toBe('/mi-cuenta');
    });

    it('espera a que se sepa si hay sesión antes de decidir', async () => {
      const { navigation, request } = await navigate('/mi-cuenta');
      // La respuesta aún no llega: no se decidió nada.
      expect(router.url).toBe('/');

      request.flush(account('user'));

      expect(await navigation).toBe(true);
      expect(router.url).toBe('/mi-cuenta');
    });

    describe('cuando la API no responde y no se sabe si hay sesión', () => {
      it('no manda a ingresar ni abre la pantalla: la navegación espera', async () => {
        const { navigation, request } = await navigate('/mi-cuenta');
        request.flush(null, unavailable);
        await vi.waitFor(() => expect(session.verificationBlocked()).toBe(true));

        expect(router.url).toBe('/');
        expect(router.getCurrentNavigation()?.finalUrl?.toString()).toBe('/mi-cuenta');
        expect(notices.notices()).toEqual([]);

        // Para no dejar la navegación pendiente al terminar
        await router.navigateByUrl('/');
        expect(await navigation).toBe(false);
      });

      it('al responder la API, sigue a la ruta que se había pedido', async () => {
        const { navigation, request } = await navigate('/mi-cuenta?pestana=datos');
        request.flush(null, unavailable);
        await vi.waitFor(() => expect(session.verificationBlocked()).toBe(true));

        session.retry();
        me().flush(account('user'));

        expect(await navigation).toBe(true);
        expect(router.url).toBe('/mi-cuenta?pestana=datos');
        expect(session.verificationBlocked()).toBe(false);
      });

      it('si al volver la API dice que no hay sesión, entonces sí lo manda a ingresar', async () => {
        const { navigation, request } = await navigate('/mi-cuenta');
        request.flush(null, unavailable);
        await vi.waitFor(() => expect(session.verificationBlocked()).toBe(true));

        session.retry();
        me().flush(null, { status: 401, statusText: 'Unauthorized' });
        await navigation;

        expect(router.url).toBe('/cuenta/ingresar?volver=%2Fmi-cuenta');
      });

      it('otra navegación la cancela: ya no pregunta ni muestra el aviso', async () => {
        const { navigation, request } = await navigate('/mi-cuenta');
        request.flush(null, unavailable);
        await vi.waitFor(() => expect(session.verificationBlocked()).toBe(true));

        await router.navigateByUrl('/tecnicas');
        await navigation;

        expect(router.url).toBe('/tecnicas');
        expect(session.verificationBlocked()).toBe(false);
      });
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

    describe('cuando la API no responde y no se sabe si hay sesión', () => {
      it('no manda a ingresar a quien quizá tiene sesión: espera y sigue a la ruta pedida', async () => {
        await failSession();
        const { navigation, request } = await navigate('/gestion/borradores');
        request.flush(null, unavailable);
        await vi.waitFor(() => expect(session.verificationBlocked()).toBe(true));
        expect(router.url).toBe('/');

        session.retry();
        me().flush(account('reviewer'));

        expect(await navigation).toBe(true);
        expect(router.url).toBe('/gestion/borradores');
      });

      it('con la sesión ya conocida no pregunta nada: el rol local solo decide qué se muestra', async () => {
        await loadSession('contributor');

        await router.navigateByUrl('/gestion/borradores');

        http.expectNone(`${TEST_API_BASE}/auth/me`);
        expect(router.url).toBe('/gestion/borradores');
      });

      it('al responder que el rol no alcanza, avisa que no hay permiso', async () => {
        const { navigation, request } = await navigate('/gestion/usuarios');
        request.flush(null, unavailable);
        await vi.waitFor(() => expect(session.verificationBlocked()).toBe(true));

        session.retry();
        me().flush(account('contributor'));
        await navigation;

        expect(router.url).toBe('/');
        expect(notices.notices().map((n) => n.messages)).toEqual([
          ['No hay permiso para esta acción.'],
        ]);
      });
    });
  });

  describe('guestGuard (ingresar y crear la cuenta)', () => {
    it('un visitante ve la pantalla', async () => {
      await loadSession(null);

      expect(await router.navigateByUrl('/cuenta/ingresar')).toBe(true);
      expect(router.url).toBe('/cuenta/ingresar');
    });

    it('quien ya tiene sesión va a donde iba (?volver=), sin ningún aviso', async () => {
      await loadSession('user');

      await router.navigateByUrl('/cuenta/ingresar?volver=%2Ftecnicas%2Fabc');

      expect(router.url).toBe('/tecnicas/abc');
      expect(notices.notices()).toEqual([]);
    });

    it('si entró directo, va al catálogo', async () => {
      await loadSession('user');

      await router.navigateByUrl('/cuenta/ingresar');

      expect(router.url).toBe('/tecnicas');
      expect(notices.notices()).toEqual([]);
    });

    it('para crear otra cuenta hay que cerrar la sesión antes: tampoco ve esa pantalla', async () => {
      await loadSession('user');

      await router.navigateByUrl('/cuenta/crear?volver=%2Ftecnicas%2Fabc');

      expect(router.url).toBe('/tecnicas/abc');
    });

    it.each([
      ['otro sitio', 'https://sitio.example'],
      ['una ruta con doble barra', '//sitio.example'],
      ['la misma pantalla de cuenta, que lo mandaría en círculos', '/cuenta/ingresar'],
      ['la de crear cuenta', '/cuenta/crear?volver=%2Fcuenta%2Fingresar'],
    ])('no hace caso de un ?volver= que lleva a %s', async (_name, volver) => {
      await loadSession('user');

      await router.navigateByUrl(`/cuenta/ingresar?volver=${encodeURIComponent(volver)}`);

      expect(router.url).toBe('/tecnicas');
    });

    it('si no se sabe si hay sesión, no la bloquea: quien llega a ingresar la ve', async () => {
      await failSession();

      expect(await router.navigateByUrl('/cuenta/ingresar')).toBe(true);
      expect(router.url).toBe('/cuenta/ingresar');
      expect(session.verificationBlocked()).toBe(false);
    });

    it('no espera a GET /auth/me: un servidor que tarda no deja la pantalla en blanco', async () => {
      const pending = session.load();

      expect(await router.navigateByUrl('/cuenta/ingresar')).toBe(true);

      me().flush(null, unavailable);
      await pending;
    });
  });
});

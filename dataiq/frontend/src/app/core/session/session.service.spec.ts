import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Account } from '../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import type { Role } from '../../domain/role';
import { SessionService } from './session.service';

const account = (role: Role = 'user'): Account => ({
  id: 'u-1',
  name: 'Ana',
  email: 'ana@example.com',
  role,
});
const credentials = { email: 'ana@example.com', password: 'secreto' };
const unauthorized = { status: 401, statusText: 'Unauthorized' };
const noContent = { status: 204, statusText: 'No Content' };

describe('SessionService', () => {
  let session: SessionService;
  let http: HttpTestingController;

  const me = () => http.expectOne(`${TEST_API_BASE}/auth/me`);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    session = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('empieza como visitante que aún no se sabe si lo es', () => {
    expect(session.account()).toBeNull();
    expect(session.isLoggedIn()).toBe(false);
    expect(session.role()).toBeNull();
    expect(session.loaded()).toBe(false);
  });

  describe('load', () => {
    it('toma la cuenta de GET /auth/me', async () => {
      const loading = session.load();
      me().flush(account('reviewer'));
      await loading;

      expect(session.account()).toEqual(account('reviewer'));
      expect(session.isLoggedIn()).toBe(true);
      expect(session.role()).toBe('reviewer');
      expect(session.loaded()).toBe(true);
    });

    it('un 401 es un visitante: sin cuenta, pero ya cargado, y no se rechaza', async () => {
      const loading = session.load();
      me().flush(null, unauthorized);
      await expect(loading).resolves.toBeUndefined();

      expect(session.account()).toBeNull();
      expect(session.loaded()).toBe(true);
    });

    it('si la API no responde queda como visitante, sin rechazar', async () => {
      const loading = session.load();
      me().error(new ProgressEvent('error'));
      await expect(loading).resolves.toBeUndefined();

      expect(session.isLoggedIn()).toBe(false);
      expect(session.loaded()).toBe(true);
    });

    it('si la API no respondió, el próximo load() vuelve a preguntar', async () => {
      const first = session.load();
      me().flush(null, { status: 504, statusText: 'Gateway Timeout' });
      await first;
      expect(session.isLoggedIn()).toBe(false);

      const second = session.load();
      expect(second).not.toBe(first);
      me().flush(account('reviewer'));
      await second;

      expect(session.role()).toBe('reviewer');
    });

    it('un 401 sí es definitivo: no vuelve a preguntar', async () => {
      const first = session.load();
      me().flush(null, unauthorized);
      await first;

      expect(session.load()).toBe(first);
      http.expectNone(`${TEST_API_BASE}/auth/me`);
    });

    it('pide la cuenta una sola vez: quien llame de nuevo recibe lo mismo', async () => {
      const first = session.load();
      const second = session.load();
      expect(second).toBe(first);
      me().flush(account());
      await first;

      await session.load();
      http.expectNone(`${TEST_API_BASE}/auth/me`);
    });

    it('la respuesta tardía de /auth/me no pisa un ingreso hecho mientras tanto', async () => {
      const loading = session.load();
      const request = me();

      session.login(credentials).subscribe();
      http.expectOne(`${TEST_API_BASE}/auth/login`).flush(account('contributor'));
      request.flush(null, unauthorized);
      await loading;

      expect(session.role()).toBe('contributor');
      expect(session.loaded()).toBe(true);
    });
  });

  describe('login', () => {
    it('deja la sesión como sabida aunque GET /auth/me no haya respondido', async () => {
      const loading = session.load();
      const request = me();

      session.login(credentials).subscribe();
      http.expectOne(`${TEST_API_BASE}/auth/login`).flush(account());

      expect(session.loaded()).toBe(true);
      expect(session.isLoggedIn()).toBe(true);
      request.flush(account());
      await loading;
    });

    it('manda las credenciales, guarda la cuenta y la devuelve', () => {
      let result: Account | undefined;
      session.login(credentials).subscribe((a) => (result = a));

      const request = http.expectOne(`${TEST_API_BASE}/auth/login`);
      expect(request.request.body).toEqual(credentials);
      request.flush(account());

      expect(result).toEqual(account());
      expect(session.account()).toEqual(account());
    });

    it('si falla, no hay cuenta y el error le llega a quien llamó', () => {
      let failure: unknown;
      session.login(credentials).subscribe({ error: (e) => (failure = e) });
      http
        .expectOne(`${TEST_API_BASE}/auth/login`)
        .flush({ detail: 'Correo o contraseña incorrectos' }, unauthorized);

      expect(failure).toBeDefined();
      expect(session.isLoggedIn()).toBe(false);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      session.login(credentials).subscribe();
      http.expectOne(`${TEST_API_BASE}/auth/login`).flush(account());
    });

    it('borra la cuenta cuando la API borró la cookie', () => {
      session.logout().subscribe();
      http.expectOne(`${TEST_API_BASE}/auth/logout`).flush(null, noContent);

      expect(session.account()).toBeNull();
    });

    it('si falla, la cuenta sigue, porque la cookie sigue', () => {
      session.logout().subscribe({ error: () => undefined });
      http
        .expectOne(`${TEST_API_BASE}/auth/logout`)
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(session.isLoggedIn()).toBe(true);
    });
  });

  it('clear olvida la cuenta sin hablar con la API', () => {
    session.login(credentials).subscribe();
    http.expectOne(`${TEST_API_BASE}/auth/login`).flush(account());

    session.clear();

    expect(session.account()).toBeNull();
    expect(session.loaded()).toBe(true);
    http.expectNone(() => true);
  });

  it('generation cambia con cada cambio de cuenta', () => {
    const start = session.generation;
    session.login(credentials).subscribe();
    http.expectOne(`${TEST_API_BASE}/auth/login`).flush(account());
    session.clear();

    expect(session.generation).toBe(start + 2);
  });

  describe('hasRole', () => {
    function signInAs(role: Role) {
      session.login(credentials).subscribe();
      http.expectOne(`${TEST_API_BASE}/auth/login`).flush(account(role));
    }

    it('un visitante no tiene ningún rol', () => {
      expect(session.hasRole('user')).toBe(false);
    });

    it('cuenta el rol y los mayores (acumulativos)', () => {
      signInAs('reviewer');

      expect(session.hasRole('user')).toBe(true);
      expect(session.hasRole('contributor')).toBe(true);
      expect(session.hasRole('reviewer')).toBe(true);
      expect(session.hasRole('admin')).toBe(false);
    });
  });
});

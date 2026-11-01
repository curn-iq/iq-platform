import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Account } from '../../data/api/models';
import { QUIET_ERRORS } from '../../data/http-context';
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

    it('si la API no responde no se sabe si hay sesión, y no se rechaza', async () => {
      const loading = session.load();
      me().error(new ProgressEvent('error'));
      await expect(loading).resolves.toBeUndefined();

      expect(session.isLoggedIn()).toBe(false);
      expect(session.loaded()).toBe(false);
      expect(session.loadFailed()).toBe(true);
    });

    it('un 5xx tampoco dice si hay sesión', async () => {
      const loading = session.load();
      me().flush(null, { status: 503, statusText: 'Service Unavailable' });
      await loading;

      expect(session.loaded()).toBe(false);
      expect(session.loadFailed()).toBe(true);
    });

    it('si la API no respondió, el próximo load() vuelve a preguntar', async () => {
      const first = session.load();
      me().flush(null, { status: 504, statusText: 'Gateway Timeout' });
      await first;
      expect(session.isLoggedIn()).toBe(false);

      const second = session.load();
      expect(second).not.toBe(first);
      expect(session.loadFailed()).toBe(false);
      me().flush(account('reviewer'));
      await second;

      expect(session.role()).toBe('reviewer');
      expect(session.loaded()).toBe(true);
      expect(session.loadFailed()).toBe(false);
    });

    it('ingresar después de un fallo deja la sesión sabida y no vuelve a preguntar', async () => {
      const failed = session.load();
      me().flush(null, { status: 500, statusText: 'Server Error' });
      await failed;

      session.login(credentials).subscribe();
      http.expectOne(`${TEST_API_BASE}/auth/login`).flush(account());

      expect(session.loaded()).toBe(true);
      expect(session.loadFailed()).toBe(false);
      await session.load();
      http.expectNone(`${TEST_API_BASE}/auth/me`);
      expect(session.isLoggedIn()).toBe(true);
    });

    it('un fallo tardío de /auth/me no borra un ingreso hecho mientras tanto', async () => {
      const loading = session.load();
      const request = me();

      session.login(credentials).subscribe();
      http.expectOne(`${TEST_API_BASE}/auth/login`).flush(account('contributor'));
      request.flush(null, { status: 500, statusText: 'Server Error' });
      await loading;

      expect(session.role()).toBe('contributor');
      expect(session.loadFailed()).toBe(false);
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

  describe('status', () => {
    it('antes de saber nada es «loading»', () => {
      expect(session.status()).toBe('loading');
    });

    it('con una cuenta es «authenticated»', async () => {
      const loading = session.load();
      me().flush(account());
      await loading;

      expect(session.status()).toBe('authenticated');
    });

    it('un 401 es «unauthenticated»: la sesión no es válida', async () => {
      const loading = session.load();
      me().flush(null, unauthorized);
      await loading;

      expect(session.status()).toBe('unauthenticated');
    });

    it.each([
      ['un 5xx', { status: 503, statusText: 'Service Unavailable' }],
      ['un tiempo agotado de la puerta de enlace', { status: 504, statusText: 'Gateway Timeout' }],
    ])('%s es «verification_unavailable», no «unauthenticated»', async (_name, response) => {
      const loading = session.load();
      me().flush(null, response);
      await loading;

      expect(session.status()).toBe('verification_unavailable');
    });

    it('sin conexión es «verification_unavailable»', async () => {
      const loading = session.load();
      me().error(new ProgressEvent('error'));
      await loading;

      expect(session.status()).toBe('verification_unavailable');
    });

    it('al volver a preguntar pasa por «loading» y termina en lo que respondió la API', async () => {
      const failed = session.load();
      me().flush(null, { status: 503, statusText: 'Service Unavailable' });
      await failed;

      const again = session.load();
      expect(session.status()).toBe('loading');
      me().flush(account());
      await again;

      expect(session.status()).toBe('authenticated');
    });
  });

  describe('si la API no responde nunca', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('pasados 15 s se da por no disponible y se cancela la petición', async () => {
      const loading = session.load();
      const request = me();

      await vi.advanceTimersByTimeAsync(14_999);
      expect(session.status()).toBe('loading');

      await vi.advanceTimersByTimeAsync(1);
      await loading;

      expect(request.cancelled).toBe(true);
      expect(session.status()).toBe('verification_unavailable');
    });
  });

  describe('verified', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const unavailable = { status: 503, statusText: 'Service Unavailable' };
    /** Deja correr lo que queda pendiente tras responder una petición. */
    const settle = () => vi.advanceTimersByTimeAsync(0);

    function watch() {
      const seen = { emitted: 0, completed: false };
      const subscription = session.verified().subscribe({
        next: () => seen.emitted++,
        complete: () => (seen.completed = true),
      });
      return { seen, subscription };
    }

    it('con una cuenta emite una vez y completa', async () => {
      const { seen } = watch();
      me().flush(account());
      await settle();

      expect(seen).toEqual({ emitted: 1, completed: true });
      expect(session.isLoggedIn()).toBe(true);
    });

    it('un 401 también es una respuesta: emite, y no hay cuenta', async () => {
      const { seen } = watch();
      me().flush(null, unauthorized);
      await settle();

      expect(seen).toEqual({ emitted: 1, completed: true });
      expect(session.status()).toBe('unauthenticated');
    });

    it('mientras la primera consulta va en camino todavía no hay aviso de indisponibilidad', () => {
      watch();

      expect(session.status()).toBe('loading');
      expect(session.verificationBlocked()).toBe(false);
      me().flush(account());
    });

    it('si la API no responde, no emite: espera, y avisa que la comprobación está detenida', async () => {
      const { seen } = watch();
      me().flush(null, unavailable);
      await settle();

      expect(seen.emitted).toBe(0);
      expect(session.verificationBlocked()).toBe(true);
    });

    it('vuelve a preguntar sola, en silencio y cada vez más despacio, hasta que responde', async () => {
      const { seen } = watch();
      me().flush(null, unavailable);
      await settle();

      // 5 s, 10 s y 20 s después de cada fallo
      for (const wait of [5_000, 10_000, 20_000]) {
        await vi.advanceTimersByTimeAsync(wait - 1);
        http.expectNone(`${TEST_API_BASE}/auth/me`);
        await vi.advanceTimersByTimeAsync(1);
        const retry = me();
        expect(retry.request.context.get(QUIET_ERRORS)).toBe(true);
        retry.flush(null, unavailable);
        await settle();
      }
      expect(seen.emitted).toBe(0);

      await vi.advanceTimersByTimeAsync(30_000);
      me().flush(account('reviewer'));
      await settle();

      expect(seen).toEqual({ emitted: 1, completed: true });
      expect(session.role()).toBe('reviewer');
      expect(session.verificationBlocked()).toBe(false);
    });

    it('la espera no pasa de 30 s', async () => {
      watch();
      me().flush(null, unavailable);
      await settle();

      for (const wait of [5_000, 10_000, 20_000, 30_000, 30_000]) {
        await vi.advanceTimersByTimeAsync(wait);
        me().flush(null, unavailable);
        await settle();
      }
    });

    it('«retry» vuelve a preguntar al momento, con aviso si falla (lo pidió la persona)', async () => {
      watch();
      me().flush(null, unavailable);
      await settle();

      session.retry();
      const request = me();

      expect(request.request.context.get(QUIET_ERRORS)).toBe(false);
      expect(session.status()).toBe('loading');
      request.flush(account());
      await settle();
      expect(session.isLoggedIn()).toBe(true);
    });

    it('al volver la conexión («online») vuelve a preguntar sin esperar', async () => {
      const { seen } = watch();
      me().error(new ProgressEvent('error'));
      await settle();

      window.dispatchEvent(new Event('online'));
      me().flush(account());
      await settle();

      expect(seen.emitted).toBe(1);
    });

    it('si se pide «retry» mientras ya pregunta, no se duplica la petición', async () => {
      watch();
      me().flush(null, unavailable);
      await settle();

      session.retry();
      session.retry();

      expect(http.match(`${TEST_API_BASE}/auth/me`)).toHaveLength(1);
    });

    it('si se cancela (otra navegación), deja de preguntar y quita el aviso', async () => {
      const { subscription } = watch();
      me().flush(null, unavailable);
      await settle();
      expect(session.verificationBlocked()).toBe(true);

      subscription.unsubscribe();
      await vi.advanceTimersByTimeAsync(60_000);

      http.expectNone(`${TEST_API_BASE}/auth/me`);
      expect(session.verificationBlocked()).toBe(false);
    });

    it('con varias rutas esperando, el aviso sigue hasta que se va la última', async () => {
      const first = watch();
      const second = watch();
      me().flush(null, unavailable);
      await settle();

      first.subscription.unsubscribe();
      expect(session.verificationBlocked()).toBe(true);
      second.subscription.unsubscribe();
      expect(session.verificationBlocked()).toBe(false);
    });

    it('ingresar mientras espera cuenta como respuesta', async () => {
      const { seen } = watch();
      me().flush(null, unavailable);
      await settle();

      session.login(credentials).subscribe();
      http.expectOne(`${TEST_API_BASE}/auth/login`).flush(account());
      await settle();

      expect(seen.emitted).toBe(1);
    });
  });
});

import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_DATAIQ } from '../../data/testing';
import { ModuleTokenService, RENEW_MARGIN_MS } from './module-token.service';

describe('ModuleTokenService', () => {
  const url = `${TEST_DATAIQ}/auth/module-token`;
  let service: ModuleTokenService;
  let http: HttpTestingController;

  const answer = (token: string, expiresIn = 300) =>
    http.expectOne(url).flush({ access_token: token, token_type: 'bearer', expires_in: expiresIn });
  const tick = () => new Promise((resolve) => setTimeout(resolve));

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    service = TestBed.inject(ModuleTokenService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('pide el token la primera vez y lo reutiliza mientras le quede vida', async () => {
    const first = service.get();
    answer('uno');
    expect(await first).toBe('uno');

    vi.advanceTimersByTime(3 * 60_000);
    expect(await service.get()).toBe('uno');
    http.expectNone(url);
  });

  it('pide otro cuando faltan menos de un minuto para que venza', async () => {
    const first = service.get();
    answer('uno');
    await first;

    vi.advanceTimersByTime(300_000 - RENEW_MARGIN_MS + 1);
    const second = service.get();
    answer('dos');
    expect(await second).toBe('dos');
  });

  it('una petición a la vez: quien pide mientras va una recibe la misma', async () => {
    const a = service.get();
    const b = service.renew();
    answer('uno');
    expect(await a).toBe('uno');
    expect(await b).toBe('uno');
  });

  it('un 401 (la sesión terminó) llega a quien pidió y no se guarda nada', async () => {
    const first = service.get().catch((error) => error);
    http.expectOne(url).flush('', { status: 401, statusText: 'Unauthorized' });
    expect((await first).status).toBe(401);

    // La siguiente vuelve a intentarlo: no quedó una petición colgada
    const second = service.get();
    answer('dos');
    expect(await second).toBe('dos');
  });

  it('dice cuánto falta para renovarlo', async () => {
    expect(service.untilRenewal()).toBe(0);
    const first = service.get();
    answer('uno', 300);
    await first;
    expect(service.untilRenewal()).toBe(300_000 - RENEW_MARGIN_MS);

    vi.advanceTimersByTime(10_000);
    expect(service.untilRenewal()).toBe(300_000 - RENEW_MARGIN_MS - 10_000);

    vi.advanceTimersByTime(600_000);
    expect(service.untilRenewal()).toBe(0);
  });

  it('forget olvida el token: la siguiente petición va a DataIQ', async () => {
    const first = service.get();
    answer('uno');
    await first;
    service.forget();
    const second = service.get();
    await tick();
    answer('dos');
    expect(await second).toBe('dos');
  });
});

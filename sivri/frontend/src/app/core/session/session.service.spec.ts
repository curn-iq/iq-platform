import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_DATAIQ } from '../../data/testing';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const ME = `${TEST_DATAIQ}/auth/me`;
  let session: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    session = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('antes de preguntar no se sabe si hay sesión', () => {
    expect(session.status()).toBe('loading');
    expect(session.account()).toBeNull();
  });

  it('con la cuenta de DataIQ, hay sesión', async () => {
    const known = session.known();
    http.expectOne(ME).flush({ id: 'u-1', name: 'Ana' });
    expect(await known).toBe('authenticated');
    expect(session.account()).toEqual({ id: 'u-1', name: 'Ana' });
  });

  it('un 401 dice que no hay sesión', async () => {
    const known = session.known();
    http.expectOne(ME).flush('', { status: 401, statusText: 'Unauthorized' });
    expect(await known).toBe('unauthenticated');
  });

  it('si DataIQ no responde no da a nadie por visitante: espera y vuelve a preguntar', async () => {
    let answer: string | undefined;
    void session.known().then((status) => (answer = status));
    http.expectOne(ME).flush('', { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(0);
    expect(session.status()).toBe('unavailable');
    expect(answer).toBeUndefined();

    await vi.advanceTimersByTimeAsync(5_000);
    http.expectOne(ME).flush({ id: 'u-1', name: 'Ana' });
    await vi.advanceTimersByTimeAsync(0);
    expect(answer).toBe('authenticated');
  });

  it('cada reintento espera más que el anterior', async () => {
    void session.known();
    http.expectOne(ME).flush('', { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(5_000);
    http.expectOne(ME).flush('', { status: 503, statusText: 'Unavailable' });

    await vi.advanceTimersByTimeAsync(9_000);
    http.expectNone(ME);
    await vi.advanceTimersByTimeAsync(1_000);
    http.expectOne(ME).flush({ id: 'u-1', name: 'Ana' });
    await vi.advanceTimersByTimeAsync(0);
  });

  it('un tiempo agotado es como no responder', async () => {
    void session.known();
    http.expectOne(ME);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(session.status()).toBe('unavailable');
    await vi.advanceTimersByTimeAsync(5_000);
    http.expectOne(ME).flush({ id: 'u-1', name: 'Ana' });
    await vi.advanceTimersByTimeAsync(0);
  });

  it('«Reintentar» vuelve a preguntar sin esperar', async () => {
    void session.known();
    http.expectOne(ME).flush('', { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(0);
    session.retry();
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne(ME).flush({ id: 'u-1', name: 'Ana' });
    await vi.advanceTimersByTimeAsync(0);
    expect(session.status()).toBe('authenticated');
  });

  it('una pregunta a la vez', () => {
    void session.check();
    void session.check();
    http.expectOne(ME).flush({ id: 'u-1', name: 'Ana' });
  });

  it('expire cierra la sesión que venció', async () => {
    const known = session.known();
    http.expectOne(ME).flush({ id: 'u-1', name: 'Ana' });
    await known;
    session.expire();
    expect(session.status()).toBe('unauthenticated');
    expect(session.account()).toBeNull();
  });
});

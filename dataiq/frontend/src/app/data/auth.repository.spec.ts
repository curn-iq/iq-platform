import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthRepository } from './auth.repository';
import { QUIET_ERRORS } from './http-context';
import { Account } from './api/models';
import { provideRepositoryTesting, TEST_API_BASE } from './testing';

const account: Account = { id: 'u-1', name: 'Ana', email: 'ana@example.com', role: 'user' };

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    repository = TestBed.inject(AuthRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('me pide la cuenta de /auth/me', () => {
    let result: Account | undefined;
    repository.me().subscribe((a) => (result = a));

    const request = http.expectOne(`${TEST_API_BASE}/auth/me`);
    expect(request.request.method).toBe('GET');
    request.flush(account);
    expect(result).toEqual(account);
  });

  it('me puede pedirse en silencio: quien lo marca no quiere un aviso si falla', () => {
    repository.me({ quiet: true }).subscribe();
    const quiet = http.expectOne(`${TEST_API_BASE}/auth/me`);
    expect(quiet.request.context.get(QUIET_ERRORS)).toBe(true);
    quiet.flush(account);

    repository.me().subscribe();
    const loud = http.expectOne(`${TEST_API_BASE}/auth/me`);
    expect(loud.request.context.get(QUIET_ERRORS)).toBe(false);
    loud.flush(account);
  });

  it('login manda el correo y la contraseña y devuelve la cuenta', () => {
    let result: Account | undefined;
    repository
      .login({ email: 'ana@example.com', password: 'secreto' })
      .subscribe((a) => (result = a));

    const request = http.expectOne(`${TEST_API_BASE}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@example.com', password: 'secreto' });
    request.flush(account);
    expect(result).toEqual(account);
  });

  it('register manda la aceptación de la política', () => {
    const registration = {
      name: 'Ana',
      email: 'ana@example.com',
      password: 'secreto',
      accepts_policy: true,
    };
    repository.register(registration).subscribe();

    const request = http.expectOne(`${TEST_API_BASE}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(registration);
    request.flush(account, { status: 201, statusText: 'Created' });
  });

  it('register puede pedirse en silencio, para que quien lo pide trate sus errores', () => {
    const registration = {
      name: 'Ana',
      email: 'ana@example.com',
      password: 'secreto',
      accepts_policy: true,
    };
    repository.register(registration, { quiet: true }).subscribe();
    const quiet = http.expectOne(`${TEST_API_BASE}/auth/register`);
    expect(quiet.request.context.get(QUIET_ERRORS)).toBe(true);
    quiet.flush(account, { status: 201, statusText: 'Created' });

    repository.register(registration).subscribe();
    const loud = http.expectOne(`${TEST_API_BASE}/auth/register`);
    expect(loud.request.context.get(QUIET_ERRORS)).toBe(false);
    loud.flush(account, { status: 201, statusText: 'Created' });
  });

  it('logout hace POST sin cuerpo', () => {
    repository.logout().subscribe();
    const request = http.expectOne(`${TEST_API_BASE}/auth/logout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});

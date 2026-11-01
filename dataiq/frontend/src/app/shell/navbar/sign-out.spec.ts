import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionService } from '../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { SignOut } from './sign-out';

@Component({ template: '' })
class Blank {}

const ACCOUNT = { id: 'u-1', name: 'Ana', email: 'ana@example.com', role: 'contributor' as const };

describe('SignOut', () => {
  let signOut: SignOut;
  let session: SessionService;
  let router: Router;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([
          { path: '', component: Blank },
          { path: 'gestion/borradores', component: Blank },
        ]),
      ],
    });
    signOut = TestBed.inject(SignOut);
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
    session.login({ email: ACCOUNT.email, password: 'x' }).subscribe();
    http.expectOne(`${TEST_API_BASE}/auth/login`).flush(ACCOUNT);
    await router.navigateByUrl('/gestion/borradores');
  });

  afterEach(() => http.verify());

  const logoutRequest = () => http.expectOne(`${TEST_API_BASE}/auth/logout`);

  it('pide cerrar la sesión con POST /auth/logout, sin cuerpo', () => {
    void signOut.run();

    const request = logoutRequest();
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('al salir, olvida la cuenta y va al inicio, también desde una pantalla de gestión', async () => {
    const done = signOut.run();
    logoutRequest().flush(null, { status: 204, statusText: 'No Content' });
    await done;

    expect(session.isLoggedIn()).toBe(false);
    expect(session.status()).toBe('unauthenticated');
    expect(router.url).toBe('/');
  });

  it('con un 401 (la sesión ya había vencido) también sale, sin error', async () => {
    const done = signOut.run();
    logoutRequest().flush(null, { status: 401, statusText: 'Unauthorized' });
    await done;

    expect(session.isLoggedIn()).toBe(false);
    expect(router.url).toBe('/');
  });

  it('si no se pudo cerrar, la sesión sigue (la cookie sigue) y no se mueve de pantalla', async () => {
    const done = signOut.run();
    logoutRequest().flush(null, { status: 503, statusText: 'Service Unavailable' });
    await expect(done).resolves.toBeUndefined();

    expect(session.isLoggedIn()).toBe(true);
    expect(router.url).toBe('/gestion/borradores');
  });

  it('sin conexión pasa lo mismo: sigue la sesión y se queda donde está', async () => {
    const done = signOut.run();
    logoutRequest().error(new ProgressEvent('error'));
    await done;

    expect(session.isLoggedIn()).toBe(true);
    expect(router.url).toBe('/gestion/borradores');
  });

  it('mientras va la petición está ocupado, y varios toques piden una sola vez', async () => {
    expect(signOut.busy()).toBe(false);

    const first = signOut.run();
    void signOut.run();
    void signOut.run();
    expect(signOut.busy()).toBe(true);
    logoutRequest().flush(null, { status: 204, statusText: 'No Content' });
    await first;

    expect(signOut.busy()).toBe(false);
  });

  it('tras un fallo se puede volver a intentar', async () => {
    const failed = signOut.run();
    logoutRequest().flush(null, { status: 500, statusText: 'Server Error' });
    await failed;

    const again = signOut.run();
    logoutRequest().flush(null, { status: 204, statusText: 'No Content' });
    await again;

    expect(session.isLoggedIn()).toBe(false);
  });
});

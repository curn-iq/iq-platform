import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService, SessionStatus } from '../session/session.service';
import { ShellNavigation } from '../session/shell';
import { unauthorizedInterceptor } from './unauthorized.interceptor';

describe('unauthorizedInterceptor', () => {
  const status = signal<SessionStatus>('authenticated');
  const expire = vi.fn();
  const goToLogin = vi.fn();
  let http: HttpTestingController;

  beforeEach(() => {
    status.set('authenticated');
    expire.mockClear();
    goToLogin.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SessionService, useValue: { status, expire } },
        { provide: ShellNavigation, useValue: { goToLogin } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function failWith(url: string, code: number): void {
    TestBed.inject(HttpClient)
      .get(url)
      .subscribe({ error: () => undefined });
    http.expectOne(url).flush('', { status: code, statusText: 'Error' });
  }

  it('un 401 con sesión es que venció: la cierra y lleva al ingreso del shell', () => {
    failWith('/api/simiq3d/chat', 401);
    expect(expire).toHaveBeenCalledOnce();
    expect(goToLogin).toHaveBeenCalledWith('/');
  });

  it('el 401 de /auth/me lo responde la sesión, no este interceptor', () => {
    failWith('/api/dataiq/auth/me', 401);
    expect(goToLogin).not.toHaveBeenCalled();
  });

  it('sin sesión no vuelve a mandar al ingreso: ya se mandó una vez', () => {
    status.set('unauthenticated');
    failWith('/api/dataiq/instruments', 401);
    expect(goToLogin).not.toHaveBeenCalled();
  });

  it('los demás errores siguen hasta quien hizo la petición', () => {
    failWith('/api/simiq3d/chat', 503);
    expect(expire).not.toHaveBeenCalled();
    expect(goToLogin).not.toHaveBeenCalled();
  });
});

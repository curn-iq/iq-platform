import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { sessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { ShellNavigation } from './shell';

describe('sessionGuard', () => {
  const goToLogin = vi.fn();

  function run(answer: 'authenticated' | 'unauthenticated') {
    goToLogin.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: { known: () => Promise.resolve(answer) } },
        { provide: ShellNavigation, useValue: { goToLogin } },
      ],
    });
    const state = { url: '/tecnicas/t-1' } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => sessionGuard({} as ActivatedRouteSnapshot, state));
  }

  it('con sesión, abre la ruta', async () => {
    expect(await run('authenticated')).toBe(true);
    expect(goToLogin).not.toHaveBeenCalled();
  });

  it('sin sesión, lleva al ingreso del shell para volver a la ruta pedida', async () => {
    expect(await run('unauthenticated')).toBe(false);
    expect(goToLogin).toHaveBeenCalledWith('/tecnicas/t-1');
  });
});

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { DESKTOP_QUERY } from '../../shared/media-query';
import { notDesktopGuard } from './desktop.guard';

function run(desktop: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: desktop && query === DESKTOP_QUERY,
  }));
  TestBed.configureTestingModule({
    providers: [{ provide: Router, useValue: { parseUrl: (url: string) => ({ url }) } }],
  });
  return TestBed.runInInjectionContext(() =>
    notDesktopGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('notDesktopGuard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('en el celular deja abrir la cámara', () => {
    expect(run(false)).toBe(true);
  });

  it('en el computador vuelve a la entrada, que explica cómo usarlo desde el celular', () => {
    expect((run(true) as UrlTree & { url: string }).url).toBe('/');
  });
});

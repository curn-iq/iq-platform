import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { loginUrl, ShellNavigation } from './shell';

describe('el ingreso del shell', () => {
  it('vuelve a la ruta de esta app, bajo /simiq3d', () => {
    expect(loginUrl('/tecnicas/t-1')).toBe(
      `${environment.shellUrl}/cuenta/ingresar?volver=%2Fsimiq3d%2Ftecnicas%2Ft-1`,
    );
    expect(loginUrl('/')).toBe(`${environment.shellUrl}/cuenta/ingresar?volver=%2Fsimiq3d%2F`);
  });

  it('va con navegación completa, porque el shell es otra app', () => {
    const assign = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { location: { assign } } }],
    });
    TestBed.inject(ShellNavigation).goToLogin('/tecnicas/t-1');
    expect(assign).toHaveBeenCalledWith(loginUrl('/tecnicas/t-1'));
  });
});

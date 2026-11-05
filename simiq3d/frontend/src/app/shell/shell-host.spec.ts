import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { SHELL_HOST } from '../../shared-shell/shell-host';
import { provideRepositoryTesting } from '../data/testing';
import { provideShellHost } from './shell-host';

describe('el adaptador de la barra compartida en SIMIQ3D', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideRepositoryTesting(), provideShellHost()],
    });
  });

  const host = () => TestBed.inject(SHELL_HOST);

  it('la marca es SIMIQ3D y la barra marca «Herramientas» como el menú actual', () => {
    expect(host().brand.label).toBe('SIMIQ3D');
    expect(host().currentMenu()).toBe('tools');
  });

  it('las rutas son del shell de DataIQ: navegación completa, nunca el router de esta app', () => {
    const { href, navigate } = host();
    expect(href({ route: '/tecnicas', queryParams: { especialidad: 'e-1' } })).toBe(
      `${environment.shellUrl}/tecnicas?especialidad=e-1`,
    );
    expect(href({ route: '/', fragment: 'camino' })).toBe(`${environment.shellUrl}/#camino`);
    expect(href({ href: '/sivri/' })).toBe('/sivri/');
    expect(navigate({ route: '/tecnicas' })).toBe(false);
  });

  it('no pide las especialidades hasta que alguien las lee', () => {
    host();
    TestBed.tick();
    // Sin lecturas, ninguna petición pendiente: `provideRepositoryTesting` las verificaría
    expect(host().specialtiesLoading).toBeDefined();
  });
});

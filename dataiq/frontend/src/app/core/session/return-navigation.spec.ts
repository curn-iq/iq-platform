import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FullNavigation } from '../router/full-navigation';
import { ReturnNavigation } from './return-navigation';

describe('ReturnNavigation', () => {
  let assign: ReturnType<typeof vi.fn>;
  let returnNavigation: ReturnNavigation;
  let router: Router;

  beforeEach(() => {
    assign = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: FullNavigation, useValue: { assign } }],
    });
    returnNavigation = TestBed.inject(ReturnNavigation);
    router = TestBed.inject(Router);
  });

  const serialized = (volver: string | null) => {
    const target = returnNavigation.resolve(volver);
    return target === false ? false : router.serializeUrl(target);
  };

  it('una ruta de esta app la toma el router, con su consulta', () => {
    expect(serialized('/tecnicas/abc/instrumental')).toBe('/tecnicas/abc/instrumental');
    expect(serialized('/gestion/borradores?x=1')).toBe('/gestion/borradores?x=1');
    expect(assign).not.toHaveBeenCalled();
  });

  it.each([
    ['la mesa de una técnica en SIMIQ3D', '/simiq3d/tecnicas/abc'],
    ['el inicio de SIMIQ3D', '/simiq3d/'],
    ['SIMIQ3D sin la barra final', '/simiq3d'],
    ['SIVRI', '/sivri/'],
  ])('%s se pide al servidor, con navegación completa', (_name, volver) => {
    expect(serialized(volver)).toBe(false);
    expect(assign).toHaveBeenCalledExactlyOnceWith(volver);
  });

  it('una ruta que solo empieza igual no es un módulo', () => {
    expect(serialized('/simiq3dx/tecnicas')).toBe('/simiq3dx/tecnicas');
    expect(assign).not.toHaveBeenCalled();
  });

  it.each([
    ['otro sitio', 'https://sitio.example/simiq3d/'],
    ['una ruta con doble barra', '//sitio.example/simiq3d/'],
    ['la propia cuenta', '/cuenta/ingresar'],
    ['nada', null],
  ])('%s lleva al catálogo, con el router', (_name, volver) => {
    expect(serialized(volver)).toBe('/tecnicas');
    expect(assign).not.toHaveBeenCalled();
  });
});

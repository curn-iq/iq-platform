import { isModuleUrl, SIVRI_URL, simiq3dTechniqueUrl } from './module-links';

describe('module-links', () => {
  it('«Ver en 3D» lleva a la técnica en SIMIQ3D', () => {
    expect(simiq3dTechniqueUrl('019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f')).toBe(
      '/simiq3d/tecnicas/019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f',
    );
  });

  it('el id va codificado', () => {
    expect(simiq3dTechniqueUrl('a/b?c')).toBe('/simiq3d/tecnicas/a%2Fb%3Fc');
  });

  it('«Comprobar con la cámara» lleva a SIVRI, sin la técnica', () => {
    expect(SIVRI_URL).toBe('/sivri/');
  });

  it.each([
    '/simiq3d',
    '/simiq3d/',
    '/simiq3d/tecnicas/abc',
    '/simiq3d?x=1',
    '/sivri/',
    '/sivri#a',
  ])('%s es de un módulo', (url) => expect(isModuleUrl(url)).toBe(true));

  it.each(['/tecnicas/abc', '/simiq3dx', '/sivrix/', '/otra/simiq3d/', 'simiq3d/', '/'])(
    '%s no es de un módulo',
    (url) => expect(isModuleUrl(url)).toBe(false),
  );
});

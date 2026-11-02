import { DEFAULT_RETURN_PATH, LOGIN_PATH, returnTarget, safeReturnUrl } from './login-path';

describe('safeReturnUrl', () => {
  it('acepta rutas de esta app, con su consulta y su fragmento', () => {
    expect(safeReturnUrl('/tecnicas')).toBe('/tecnicas');
    expect(safeReturnUrl('/tecnicas?especialidad=urologia')).toBe(
      '/tecnicas?especialidad=urologia',
    );
    expect(safeReturnUrl('/gestion/editor/v-1/2#mesa')).toBe('/gestion/editor/v-1/2#mesa');
    expect(safeReturnUrl('/')).toBe('/');
  });

  it('rechaza lo que no vino o está vacío', () => {
    expect(safeReturnUrl(undefined)).toBeUndefined();
    expect(safeReturnUrl(null)).toBeUndefined();
    expect(safeReturnUrl('')).toBeUndefined();
  });

  it.each([
    'https://sitio.example',
    'http://sitio.example/tecnicas',
    '//sitio.example',
    '//sitio.example/tecnicas',
    '/\\sitio.example',
    '\\\\sitio.example',
    'javascript:alert(1)',
    'tecnicas',
    '/tecnicas\nSet-Cookie: x=1',
    '/tecnicas\r\n',
    '/\tsitio.example',
  ])('rechaza %j: llevaría a otro sitio o no es una ruta', (value) => {
    expect(safeReturnUrl(value)).toBeUndefined();
  });

  it('LOGIN_PATH es la pantalla de ingreso de la cuenta', () => {
    expect(LOGIN_PATH).toBe('/cuenta/ingresar');
  });
});

describe('returnTarget', () => {
  it('vuelve a la ruta de ?volver= si es de esta app', () => {
    expect(returnTarget('/tecnicas/abc/instrumental')).toBe('/tecnicas/abc/instrumental');
    expect(returnTarget('/gestion/borradores?x=1')).toBe('/gestion/borradores?x=1');
  });

  it('sin ?volver= o con uno que no es de esta app, va al catálogo', () => {
    expect(DEFAULT_RETURN_PATH).toBe('/tecnicas');
    expect(returnTarget(null)).toBe('/tecnicas');
    expect(returnTarget('')).toBe('/tecnicas');
    expect(returnTarget('https://sitio.example')).toBe('/tecnicas');
    expect(returnTarget('//sitio.example')).toBe('/tecnicas');
  });

  it('no vuelve a la cuenta: quien ya ingresó daría vueltas entre las dos pantallas', () => {
    expect(returnTarget('/cuenta/ingresar')).toBe('/tecnicas');
    expect(returnTarget('/cuenta/crear?volver=%2Fx')).toBe('/tecnicas');
    expect(returnTarget('/cuenta')).toBe('/tecnicas');
  });

  it('una ruta que solo empieza parecido sí es de otra parte', () => {
    expect(returnTarget('/cuentas-claras')).toBe('/cuentas-claras');
  });
});

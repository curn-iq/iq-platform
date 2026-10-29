import { LOGIN_PATH, safeReturnUrl } from './login-path';

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

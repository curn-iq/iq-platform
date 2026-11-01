import { accountModeOf, ACCOUNT_SEGMENTS, greeting, techniqueIdOfReturnUrl } from './account-entry';

const ID = '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f';

describe('accountModeOf', () => {
  it('«ingresar» es el ingreso y «crear» el registro', () => {
    expect(accountModeOf('ingresar')).toBe('login');
    expect(accountModeOf('crear')).toBe('register');
  });

  it('cualquier otro segmento no es una pantalla de la cuenta', () => {
    expect(accountModeOf('registro')).toBeUndefined();
    expect(accountModeOf('')).toBeUndefined();
    expect(accountModeOf(undefined)).toBeUndefined();
    expect(accountModeOf('Ingresar')).toBeUndefined();
  });

  it('cada modo tiene su segmento de la URL', () => {
    expect(ACCOUNT_SEGMENTS).toEqual({ login: 'ingresar', register: 'crear' });
  });
});

describe('greeting', () => {
  it.each([
    [0, 'Buenos días.'],
    [11, 'Buenos días.'],
    [12, 'Buenas tardes.'],
    [18, 'Buenas tardes.'],
    [19, 'Buenas noches.'],
    [23, 'Buenas noches.'],
  ])('al ingresar, a las %i h dice «%s»', (hour, text) => {
    expect(greeting('login', hour)).toBe(text);
  });

  it('al crear una cuenta dice «Mucho gusto.» a cualquier hora', () => {
    expect(greeting('register', 3)).toBe('Mucho gusto.');
    expect(greeting('register', 15)).toBe('Mucho gusto.');
  });
});

describe('techniqueIdOfReturnUrl', () => {
  it('saca el id de la técnica de la ruta a la que se iba, con o sin pestaña', () => {
    expect(techniqueIdOfReturnUrl(`/tecnicas/${ID}/instrumental`)).toBe(ID);
    expect(techniqueIdOfReturnUrl(`/tecnicas/${ID}`)).toBe(ID);
    expect(techniqueIdOfReturnUrl(`/tecnicas/${ID}/mesa-de-mayo?x=1#a`)).toBe(ID);
  });

  it('el catálogo y otras rutas no son una técnica', () => {
    expect(techniqueIdOfReturnUrl('/tecnicas')).toBeUndefined();
    expect(techniqueIdOfReturnUrl('/tecnicas?especialidad=e-1')).toBeUndefined();
    expect(techniqueIdOfReturnUrl('/gestion/borradores')).toBeUndefined();
    expect(techniqueIdOfReturnUrl(`/otra/tecnicas/${ID}`)).toBeUndefined();
  });

  it('un id que no es un UUID no se pide a la API', () => {
    expect(techniqueIdOfReturnUrl('/tecnicas/tiroidectomia/instrumental')).toBeUndefined();
  });

  it('sin ruta no hay técnica', () => {
    expect(techniqueIdOfReturnUrl(undefined)).toBeUndefined();
    expect(techniqueIdOfReturnUrl(null)).toBeUndefined();
    expect(techniqueIdOfReturnUrl('')).toBeUndefined();
  });
});

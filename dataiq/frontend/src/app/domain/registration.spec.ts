import {
  isPlausibleEmail,
  isPlausiblePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from './registration';

describe('isPlausibleEmail', () => {
  it.each(['ana@example.com', 'ana.perez+iq@uninunez.edu.co', ' ana@example.com ', 'a@b.co'])(
    'acepta %j',
    (value) => {
      expect(isPlausibleEmail(value)).toBe(true);
    },
  );

  it.each([
    '',
    '   ',
    'ana',
    'ana@',
    '@example.com',
    'ana@example',
    'ana @example.com',
    'ana@exa mple.com',
    'ana@@example.com',
    'ana@example..',
  ])('rechaza %j', (value) => {
    expect(isPlausibleEmail(value)).toBe(false);
  });

  it('solo mira la forma: que el correo exista lo dice la API', () => {
    expect(isPlausibleEmail('nadie@dominio-que-no-existe.example')).toBe(true);
  });
});

describe('isPlausiblePassword', () => {
  it('la API pide de 8 a 128 caracteres', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(MAX_PASSWORD_LENGTH).toBe(128);
  });

  it('acepta desde 8 caracteres', () => {
    expect(isPlausiblePassword('x'.repeat(8))).toBe(true);
    expect(isPlausiblePassword('una contraseña larga')).toBe(true);
  });

  it('rechaza menos de 8, también vacía', () => {
    expect(isPlausiblePassword('x'.repeat(7))).toBe(false);
    expect(isPlausiblePassword('')).toBe(false);
  });

  it('los espacios cuentan: la contraseña no se recorta', () => {
    expect(isPlausiblePassword('       ')).toBe(false);
    expect(isPlausiblePassword('        ')).toBe(true);
  });

  it('no pasa de 128', () => {
    expect(isPlausiblePassword('x'.repeat(128))).toBe(true);
    expect(isPlausiblePassword('x'.repeat(129))).toBe(false);
  });
});

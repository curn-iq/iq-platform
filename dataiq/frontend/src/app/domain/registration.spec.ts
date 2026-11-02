import { isPlausibleEmail, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './registration';

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

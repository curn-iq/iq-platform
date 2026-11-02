import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { EMAIL_ERROR } from './registration-form';
import { emptyLogin, LOGIN_EMAIL_ERROR, LOGIN_PASSWORD_ERROR, loginSchema } from './login-form';

describe('loginSchema', () => {
  function create(values: Partial<ReturnType<typeof emptyLogin>> = {}) {
    const model = signal({ ...emptyLogin(), ...values });
    const tree = TestBed.runInInjectionContext(() => form(model, loginSchema));
    const messages = () => ({
      email: tree
        .email()
        .errors()
        .map((e) => e.message),
      password: tree
        .password()
        .errors()
        .map((e) => e.message),
    });
    return { tree, messages };
  }

  it('el texto de cada error es el aprobado, en voz impersonal', () => {
    expect(LOGIN_EMAIL_ERROR).toBe('Escribir el correo.');
    expect(LOGIN_PASSWORD_ERROR).toBe('Escribir la contraseña.');
  });

  it('empieza vacío', () => {
    expect(emptyLogin()).toEqual({ email: '', password: '' });
  });

  it('un correo y una contraseña bastan', () => {
    const { tree, messages } = create({ email: 'ana@example.com', password: 'x' });

    expect(tree().valid()).toBe(true);
    expect(messages()).toEqual({ email: [], password: [] });
  });

  it('vacío, dice qué falta en cada campo, una sola vez', () => {
    expect(create().messages()).toEqual({
      email: [LOGIN_EMAIL_ERROR],
      password: [LOGIN_PASSWORD_ERROR],
    });
  });

  it('un correo de solo espacios es un correo que falta', () => {
    expect(create({ email: '   ', password: 'x' }).messages().email).toEqual([LOGIN_EMAIL_ERROR]);
  });

  it('un correo sin forma de correo pide uno válido, con el mismo texto del registro', () => {
    expect(create({ email: 'ana', password: 'x' }).messages().email).toEqual([EMAIL_ERROR]);
    expect(create({ email: ' ana@example.com ', password: 'x' }).messages().email).toEqual([]);
  });

  it('la contraseña no se juzga: ni largo mínimo (no se dice la regla) ni recorte', () => {
    expect(create({ email: 'ana@example.com', password: 'a' }).messages().password).toEqual([]);
    expect(create({ email: 'ana@example.com', password: ' ' }).messages().password).toEqual([]);
    expect(create({ email: 'ana@example.com', password: '' }).messages().password).toEqual([
      LOGIN_PASSWORD_ERROR,
    ]);
  });
});

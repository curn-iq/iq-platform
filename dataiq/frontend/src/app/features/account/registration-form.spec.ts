import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import {
  emptyRegistration,
  NAME_ERROR,
  EMAIL_ERROR,
  PASSWORD_ERROR,
  POLICY_ERROR,
  registrationSchema,
} from './registration-form';

describe('registrationSchema', () => {
  function create(values: Partial<ReturnType<typeof emptyRegistration>> = {}) {
    const model = signal({ ...emptyRegistration(), ...values });
    const tree = TestBed.runInInjectionContext(() => form(model, registrationSchema));
    const messages = () => ({
      name: tree
        .name()
        .errors()
        .map((e) => e.message),
      email: tree
        .email()
        .errors()
        .map((e) => e.message),
      password: tree
        .password()
        .errors()
        .map((e) => e.message),
      acceptsPolicy: tree
        .acceptsPolicy()
        .errors()
        .map((e) => e.message),
    });
    return { model, tree, messages };
  }

  const valid = {
    name: 'Ana Pérez',
    email: 'ana@example.com',
    password: 'una contraseña',
    acceptsPolicy: true,
  };

  it('el texto de cada error es el aprobado, en voz impersonal', () => {
    expect(NAME_ERROR).toBe('Escribir el nombre.');
    expect(EMAIL_ERROR).toBe('Escribir un correo válido.');
    expect(PASSWORD_ERROR).toBe('La contraseña necesita al menos 8 caracteres.');
    expect(POLICY_ERROR).toBe('Para crear la cuenta hay que aceptar el aviso de privacidad.');
  });

  it('empieza vacío y sin aceptar nada', () => {
    expect(emptyRegistration()).toEqual({
      name: '',
      email: '',
      password: '',
      acceptsPolicy: false,
    });
  });

  it('un formulario completo es válido', () => {
    const { tree, messages } = create(valid);

    expect(tree().valid()).toBe(true);
    expect(messages()).toEqual({ name: [], email: [], password: [], acceptsPolicy: [] });
  });

  it('vacío, dice qué falta en cada campo, sin repetir', () => {
    const { messages } = create();

    expect(messages()).toEqual({
      name: [NAME_ERROR],
      email: [EMAIL_ERROR],
      password: [PASSWORD_ERROR],
      acceptsPolicy: [POLICY_ERROR],
    });
  });

  it('un nombre de solo espacios no cuenta', () => {
    expect(create({ ...valid, name: '   ' }).messages().name).toEqual([NAME_ERROR]);
  });

  it('un correo con espacios en los bordes está bien (se recorta al enviar); sin forma de correo, no', () => {
    expect(create({ ...valid, email: ' ana@example.com ' }).messages().email).toEqual([]);
    expect(create({ ...valid, email: 'ana@' }).messages().email).toEqual([EMAIL_ERROR]);
  });

  it('la contraseña pide 8 caracteres y los espacios cuentan', () => {
    expect(create({ ...valid, password: '1234567' }).messages().password).toEqual([PASSWORD_ERROR]);
    expect(create({ ...valid, password: '12345678' }).messages().password).toEqual([]);
    expect(create({ ...valid, password: '        ' }).messages().password).toEqual([]);
  });

  it('sin aceptar el aviso no es válido, aunque lo demás esté bien', () => {
    const { tree, messages } = create({ ...valid, acceptsPolicy: false });

    expect(tree().valid()).toBe(false);
    expect(messages().acceptsPolicy).toEqual([POLICY_ERROR]);
  });
});

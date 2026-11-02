import { schema, validate } from '@angular/forms/signals';
import { isPlausibleEmail } from '../../domain/registration';
import { EMAIL_ERROR } from './registration-form';

/**
 * Lo que dice cada error bajo su campo al intentar ingresar (voz impersonal; aprobados por Juan
 * el 2026-11-01, Resuelto 43 de `dataiq/docs/checklist-frontend.md`). Un correo con mala forma
 * dice lo mismo que en el registro (`EMAIL_ERROR`).
 */
export const LOGIN_EMAIL_ERROR = 'Escribir el correo.';
export const LOGIN_PASSWORD_ERROR = 'Escribir la contraseña.';

/** Lo que se escribe al ingresar. */
export interface LoginModel {
  email: string;
  password: string;
}

export function emptyLogin(): LoginModel {
  return { email: '', password: '' };
}

/**
 * Las reglas del formulario de Ingresar. La contraseña solo debe estar escrita: no se juzga su
 * largo (no se le dice a quien prueba cuál es la regla) ni se recorta. La API decide si es correcta.
 */
export const loginSchema = schema<LoginModel>((path) => {
  validate(path.email, ({ value }) => {
    if (!value().trim()) return { kind: 'required', message: LOGIN_EMAIL_ERROR };
    return isPlausibleEmail(value()) ? undefined : { kind: 'email', message: EMAIL_ERROR };
  });
  validate(path.password, ({ value }) =>
    value() ? undefined : { kind: 'required', message: LOGIN_PASSWORD_ERROR },
  );
});

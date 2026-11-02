import { schema, validate } from '@angular/forms/signals';
import {
  isPlausibleEmail,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '../../domain/registration';

/**
 * Lo que dice cada error bajo su campo al intentar crear la cuenta (voz impersonal; aprobados
 * por Juan el 2026-11-01, Resuelto 43 de `dataiq/docs/checklist-frontend.md`). Solo dicen qué
 * corregir en la forma de lo escrito: nunca nada que dependa de las cuentas que ya existen.
 */
export const NAME_ERROR = 'Escribir el nombre.';
export const EMAIL_ERROR = 'Escribir un correo válido.';
export const PASSWORD_ERROR = `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
export const PASSWORD_TOO_LONG_ERROR = `La contraseña admite hasta ${MAX_PASSWORD_LENGTH} caracteres.`;
export const POLICY_ERROR = 'Para crear la cuenta hay que aceptar el aviso de privacidad.';

/** Lo que se escribe al crear la cuenta; `acceptsPolicy` es la casilla de mayor de 18 años y aviso. */
export interface RegistrationModel {
  name: string;
  email: string;
  password: string;
  acceptsPolicy: boolean;
}

/** El formulario vacío, sin aceptar nada: el silencio nunca cuenta como autorización. */
export function emptyRegistration(): RegistrationModel {
  return { name: '', email: '', password: '', acceptsPolicy: false };
}

/** Las reglas del formulario de Crear cuenta. La API vuelve a validar todo. */
export const registrationSchema = schema<RegistrationModel>((path) => {
  validate(path.name, ({ value }) =>
    value().trim() ? undefined : { kind: 'required', message: NAME_ERROR },
  );
  validate(path.email, ({ value }) =>
    isPlausibleEmail(value()) ? undefined : { kind: 'email', message: EMAIL_ERROR },
  );
  // No se recorta: los espacios cuentan.
  validate(path.password, ({ value }) => {
    if (value().length < MIN_PASSWORD_LENGTH) return { kind: 'short', message: PASSWORD_ERROR };
    return value().length > MAX_PASSWORD_LENGTH
      ? { kind: 'long', message: PASSWORD_TOO_LONG_ERROR }
      : undefined;
  });
  validate(path.acceptsPolicy, ({ value }) =>
    value() ? undefined : { kind: 'policy', message: POLICY_ERROR },
  );
});

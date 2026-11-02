/** Lo que pide la API para la contraseña al crear la cuenta (`RegisterIn`, OWASP). */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

// Una arroba con algo a cada lado y un punto en el dominio, sin espacios. Solo mira la forma
// para avisar un error de tipeo; que el correo sea válido y no esté repetido lo decide la API.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** `true` si el texto, sin espacios en los bordes, tiene forma de correo. */
export function isPlausibleEmail(value: string): boolean {
  return EMAIL_SHAPE.test(value.trim());
}

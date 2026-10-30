/** Pantalla de ingreso; `?volver=` lleva la ruta a la que se iba. */
export const LOGIN_PATH = '/cuenta/ingresar';

/**
 * La ruta a la que volver tras ingresar, o `undefined` si el valor de `?volver=`
 * no es una ruta de esta misma app. `volver` viene de la URL y cualquiera puede
 * escribirlo: sin esta revisión sería un enlace que, tras ingresar, lleva a otro
 * sitio (redirección abierta).
 */
export function safeReturnUrl(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/')) return undefined;
  // `//sitio` y `/\sitio` los toma el navegador como otro origen; los caracteres
  // de control y la barra invertida no tienen cabida en una ruta propia.
  if (value.startsWith('//') || /[\u0000-\u001f\u007f\\]/.test(value)) return undefined;
  return value;
}

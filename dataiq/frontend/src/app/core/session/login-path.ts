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

/** A dónde se va tras ingresar si no se venía de otra parte: el catálogo. */
export const DEFAULT_RETURN_PATH = '/tecnicas';

/**
 * A dónde lleva `?volver=` a quien ya tiene sesión: la ruta si es de esta app (ver
 * `safeReturnUrl`), y si no, o si es de la cuenta (que lo devolvería a ella en círculos), el
 * catálogo.
 */
export function returnTarget(value: string | null | undefined): string {
  const url = safeReturnUrl(value);
  const inAccount = url !== undefined && /^\/cuenta(?:[/?#]|$)/.test(url);
  return url === undefined || inAccount ? DEFAULT_RETURN_PATH : url;
}

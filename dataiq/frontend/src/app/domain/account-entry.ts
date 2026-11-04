import { isUuid } from './uuid';

/** Las dos pantallas de la cuenta: ingresar y crear la cuenta. */
export type AccountMode = 'login' | 'register';

/** Cómo se llama cada una en la URL: `/cuenta/ingresar` y `/cuenta/crear`. */
export const ACCOUNT_SEGMENTS: Readonly<Record<AccountMode, string>> = {
  login: 'ingresar',
  register: 'crear',
};

/** La pantalla de un segmento de la URL, o `undefined` si el segmento no es de la cuenta. */
export function accountModeOf(segment: string | null | undefined): AccountMode | undefined {
  return (Object.keys(ACCOUNT_SEGMENTS) as AccountMode[]).find(
    (mode) => ACCOUNT_SEGMENTS[mode] === segment,
  );
}

/**
 * El saludo de la mitad izquierda cuando se entró directo, sin una técnica que abrir
 * (ver «Ingresar / Crear cuenta (página)» en `DESIGN.md`): según la hora al ingresar, y
 * «Mucho gusto.» al crear la cuenta. `hour` es la hora local, de 0 a 23.
 */
export function greeting(mode: AccountMode, hour: number): string {
  if (mode === 'register') return 'Mucho gusto.';
  if (hour < 12) return 'Buenos días.';
  return hour < 19 ? 'Buenas tardes.' : 'Buenas noches.';
}

/** Una técnica del detalle (`/tecnicas/:id/…`) o su mesa en SIMIQ3D (`/simiq3d/tecnicas/:id`). */
const TECHNIQUE_ROUTE = /^(?:\/simiq3d)?\/tecnicas\/([^/?#]+)(?:[/?#]|$)/;

/**
 * El id de la técnica a la que se iba (`?volver=/tecnicas/:id/…`, o `/simiq3d/tecnicas/:id` si se
 * iba a verla en 3D), o `undefined` si la ruta no es de una técnica o su id no puede serlo: un id
 * imposible ni se pide a la API.
 */
export function techniqueIdOfReturnUrl(returnUrl: string | null | undefined): string | undefined {
  const id = returnUrl ? TECHNIQUE_ROUTE.exec(returnUrl)?.[1] : undefined;
  return id !== undefined && isUuid(id) ? id : undefined;
}

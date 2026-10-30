/** Rol de una cuenta, de menor a mayor. Los roles son acumulativos. */
export type Role = 'user' | 'contributor' | 'reviewer' | 'admin';

/** Los roles en orden de menor a mayor, el mismo de `ROLE_ORDER` en el backend. */
export const ROLES: readonly Role[] = ['user', 'contributor', 'reviewer', 'admin'];

/**
 * Dice si `role` puede todo lo que puede `minimum`. Solo decide qué se muestra:
 * quien permite o niega es la API.
 */
export function hasAtLeast(role: Role, minimum: Role): boolean {
  return ROLES.indexOf(role) >= ROLES.indexOf(minimum);
}

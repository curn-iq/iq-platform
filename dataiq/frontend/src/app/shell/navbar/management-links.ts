import { hasAtLeast, Role } from '../../domain/role';

/** Un acceso de gestión y el rol mínimo que lo ve. */
export interface ManagementLink {
  readonly label: string;
  readonly route: string;
  readonly minimum: Role;
}

// Roles acumulativos: cada uno ve lo del anterior. Los nombres son los del
// mockup (`tecnica.html`); la cifra de cada acceso llega con su pantalla.
export const MANAGEMENT_LINKS: readonly ManagementLink[] = [
  { label: 'Mis borradores', route: '/gestion/borradores', minimum: 'contributor' },
  { label: 'Por revisar', route: '/gestion/revision', minimum: 'reviewer' },
  { label: 'Instrumental', route: '/gestion/instrumental', minimum: 'reviewer' },
  { label: 'Usuarios y roles', route: '/gestion/usuarios', minimum: 'admin' },
];

/**
 * Los accesos de gestión que el rol permite. Solo decide qué se muestra: quien
 * permite o niega es la API (y `roleGuard` en la ruta).
 */
export function managementLinks(role: Role): readonly ManagementLink[] {
  return MANAGEMENT_LINKS.filter((link) => hasAtLeast(role, link.minimum));
}

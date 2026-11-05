import { hasAtLeast, Role } from "../role";

/** La cifra que lleva un acceso junto a su nombre. */
export type ManagementCounter = "pending_reviews";

/** Un acceso de gestión y el rol mínimo que lo ve. */
export interface ManagementLink {
  readonly label: string;
  readonly route: string;
  readonly minimum: Role;
  /** Qué cuenta la cifra de este acceso. Sin ella, el acceso no lleva cifra. */
  readonly counter?: ManagementCounter;
}

// Roles acumulativos: cada uno ve lo del anterior. Los nombres son los del
// mockup (`tecnica.html`); la cifra de cada acceso llega con su pantalla
// (hoy, la de «Por revisar»).
export const MANAGEMENT_LINKS: readonly ManagementLink[] = [
  {
    label: "Mis borradores",
    route: "/gestion/borradores",
    minimum: "contributor",
  },
  {
    label: "Por revisar",
    route: "/gestion/revision",
    minimum: "reviewer",
    counter: "pending_reviews",
  },
  {
    label: "Instrumental",
    route: "/gestion/instrumental",
    minimum: "reviewer",
  },
  { label: "Usuarios y roles", route: "/gestion/usuarios", minimum: "admin" },
];

/**
 * Los accesos de gestión que el rol permite. Solo decide qué se muestra: quien
 * permite o niega es la API (y `roleGuard` en la ruta).
 */
export function managementLinks(role: Role): readonly ManagementLink[] {
  return MANAGEMENT_LINKS.filter((link) => hasAtLeast(role, link.minimum));
}

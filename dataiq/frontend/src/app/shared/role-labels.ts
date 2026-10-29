import type { Role } from '../domain/role';

/** Cómo se llama cada rol en la interfaz (en el código y la API son `user`, `contributor`…). */
export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  user: 'Usuario',
  contributor: 'Colaborador',
  reviewer: 'Revisor',
  admin: 'Admin',
};

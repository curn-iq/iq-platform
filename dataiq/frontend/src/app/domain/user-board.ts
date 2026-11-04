import { MONTHS, sameDay } from './edited-date';
import { ROLES, type Role } from './role';
import { plain } from './technique-search';

/** Lo que la actividad de una cuenta cuenta de ella en DataIQ (`ActivityOut` de la API). */
export interface PersonActivity {
  drafts: number;
  returned: number;
  in_review: number;
  published_techniques: number;
  reviewed: number;
}

/** Una cuenta tal como la pinta Usuarios y roles: los campos de `UserOut` que usa la pantalla. */
export interface Person {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
  policy_accepted_at: string;
  policy_version: string;
  activity: PersonActivity;
}

/** Las columnas del tablero, de mayor a menor rol. */
export const BOARD_ROLES: readonly Role[] = ['admin', 'reviewer', 'contributor', 'user'];

/** El título de cada columna. */
export const COLUMN_TITLES: Readonly<Record<Role, string>> = {
  admin: 'Admin',
  reviewer: 'Revisores',
  contributor: 'Colaboradores',
  user: 'Usuarios',
};

/** Lo que puede cada rol, en la cabecera de su columna. */
export const ROLE_CAPABILITIES: Readonly<Record<Role, string>> = {
  admin: 'Asigna roles.',
  reviewer: 'Publica lo suyo y aprueba lo de los colaboradores.',
  contributor: 'Crea técnicas y las envía a revisión.',
  user: 'Ve las técnicas completas y usa los módulos.',
};

/** Lo que podrá hacer quien recibe el rol, para la frase «Podrá …» de la confirmación. */
const WILL_BE_ABLE_TO: Readonly<Record<Role, string>> = {
  admin: 'asignar roles',
  reviewer: 'publicar lo suyo y aprobar lo de los colaboradores',
  contributor: 'crear técnicas y enviarlas a revisión',
  user: 'ver las técnicas completas y usar los módulos',
};

/** Singular y plural con que la línea de resumen nombra a cada rol. */
const SUMMARY_NAMES: Readonly<Record<Role, readonly [string, string]>> = {
  admin: ['admin', 'admin'],
  reviewer: ['revisor', 'revisores'],
  contributor: ['colaborador', 'colaboradores'],
  user: ['usuario', 'usuarios'],
};

/** Cuántos usuarios recientes muestra su columna. */
export const RECENT_USERS = 5;

/** Cuántos resultados muestra una búsqueda antes de pedir que se afine. */
export const MAX_SEARCH_RESULTS = 8;

function byName(a: Person, b: Person): number {
  return plain(a.name).localeCompare(plain(b.name), 'es') || a.email.localeCompare(b.email);
}

/** Las cuentas de un rol, por nombre (sin tildes ni mayúsculas). */
export function peopleWithRole(people: readonly Person[], role: Role): Person[] {
  return people.filter((person) => person.role === role).sort(byName);
}

/** Los usuarios más recientes: los `limit` con `created_at` más reciente, sin las ya mostradas. */
export function recentUsers(
  people: readonly Person[],
  excluding: ReadonlySet<string> = new Set(),
  limit: number = RECENT_USERS,
): Person[] {
  return people
    .filter((person) => person.role === 'user' && !excluding.has(person.id))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || byName(a, b))
    .slice(0, limit);
}

/** «3 admin · 2 revisores · 2 colaboradores · 86 usuarios»; con una sola, en singular. */
export function summaryLine(people: readonly Person[]): string {
  return BOARD_ROLES.map((role) => {
    const count = people.filter((person) => person.role === role).length;
    const [one, many] = SUMMARY_NAMES[role];
    return `${count} ${count === 1 ? one : many}`;
  }).join(' · ');
}

export interface SearchResult {
  /** Las coincidencias que se muestran, por nombre. */
  shown: Person[];
  /** Cuántas coincidencias más hay sin mostrar. */
  more: number;
}

/**
 * Las cuentas cuyo nombre o correo contiene lo escrito, sin importar tildes ni mayúsculas;
 * `role` limita la búsqueda a un rol. Sin nada escrito no hay resultados.
 */
export function searchPeople(
  people: readonly Person[],
  query: string,
  role: Role | null = null,
  limit: number = MAX_SEARCH_RESULTS,
): SearchResult {
  const needle = plain(query.trim());
  if (needle === '') return { shown: [], more: 0 };
  const found = people
    .filter((person) => role === null || person.role === role)
    .filter((person) => plain(person.name).includes(needle) || plain(person.email).includes(needle))
    .sort(byName);
  return { shown: found.slice(0, limit), more: Math.max(0, found.length - limit) };
}

/**
 * El correo partido en su parte local y su dominio («@correo.com», con la arroba): las filas
 * recortan solo la parte local, para que el dominio siempre se lea.
 */
export function splitEmail(email: string): { local: string; domain: string } {
  const at = email.lastIndexOf('@');
  return at === -1
    ? { local: email, domain: '' }
    : { local: email.slice(0, at), domain: email.slice(at) };
}

/** La lista con la cuenta cambiada por su versión nueva (misma `id`). */
export function replacePerson(people: readonly Person[], updated: Person): Person[] {
  return people.map((person) => (person.id === updated.id ? updated : person));
}

/**
 * Una fecha de la ficha: «Hoy», «Ayer» o «25 sep 2026» (siempre con año), en hora local y sin
 * `Intl`, como las demás fechas de la gestión.
 */
export function formatPersonDate(date: Date, now: Date): string {
  if (sameDay(date, now)) return 'Hoy';
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Ayer';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Lo que la cuenta hizo en DataIQ, en una línea: las cifras que no son cero, separadas por « · »
 * (borradores, devueltas, en revisión, técnicas publicadas y versiones revisadas). Sin ninguna,
 * «Sin actividad en DataIQ».
 */
export function activityLine(activity: PersonActivity): string {
  const parts = [
    activity.drafts > 0 ? count(activity.drafts, 'borrador', 'borradores') : '',
    activity.returned > 0 ? count(activity.returned, 'devuelta', 'devueltas') : '',
    activity.in_review > 0
      ? count(activity.in_review, 'versión en revisión', 'versiones en revisión')
      : '',
    activity.published_techniques > 0
      ? count(activity.published_techniques, 'técnica publicada', 'técnicas publicadas')
      : '',
    activity.reviewed > 0
      ? count(activity.reviewed, 'versión revisada', 'versiones revisadas')
      : '',
  ].filter((part) => part !== '');
  return parts.length > 0 ? parts.join(' · ') : 'Sin actividad en DataIQ';
}

/** Lo que la confirmación de un cambio de rol dice y pide. */
export interface RoleChange {
  from: Role;
  to: Role;
  /** Si el rol nuevo es mayor que el actual. */
  upgrade: boolean;
  /** Lo que sigue al «Cambiar el rol de X de A a B.» */
  consequence: string;
  /** Lo que el admin verificó por fuera, o `null` si el rol nuevo no lo pide. */
  verification: string | null;
}

/** Lo que el admin tiene que haber verificado antes de dar este rol. */
export function verificationFor(role: Role): string | null {
  if (role === 'reviewer') return 'Verifiqué que es docente o instrumentador titulado.';
  if (role === 'admin') return 'Es parte del equipo operativo del proyecto.';
  return null;
}

/** Cómo se confirma pasar una cuenta del rol `from` al rol `to`. */
export function describeRoleChange(from: Role, to: Role): RoleChange {
  const upgrade = ROLES.indexOf(to) > ROLES.indexOf(from);
  return {
    from,
    to,
    upgrade,
    consequence: upgrade
      ? `Podrá ${WILL_BE_ABLE_TO[to]}.`
      : 'Deja de poder lo que su rol actual le permitía.',
    verification: verificationFor(to),
  };
}

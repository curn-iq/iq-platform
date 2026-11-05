import { InjectionToken, type Signal } from "@angular/core";
import type { NavMenuId, NavTarget } from "./navbar/nav-menus";
import type { Role } from "./role";

/** Lo que la barra necesita saber de la cuenta conectada. */
export interface ShellAccount {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
}

/** Una especialidad con los nombres de sus técnicas publicadas. */
export interface SpecialtyEntry {
  readonly id: string;
  readonly name: string;
  readonly techniques: readonly string[];
}

/** La marca de la barra: su nombre y a dónde lleva. */
export interface ShellBrand {
  readonly label: string;
  readonly target: NavTarget;
}

/**
 * Lo que la barra del shell le pide a la app donde está (DataIQ o SIMIQ3D). La barra es una sola,
 * compartida (`shared/shell/`); cada app la provee con su sesión, sus rutas y sus datos
 * (`provide(SHELL_HOST, …)`). Lo único que cambia entre módulos es esto y los colores del tema.
 */
export interface ShellHost {
  /** La marca de la barra (en DataIQ, «IQ Platform»; en SIMIQ3D, «SIMIQ3D»). */
  readonly brand: ShellBrand;
  /** El menú de la barra que corresponde a donde se está, si hay uno. */
  readonly currentMenu: Signal<NavMenuId | null>;
  /** La ruta de la app donde se está, sin la base: sirve para marcar el acceso actual. */
  readonly currentUrl: Signal<string>;

  /** Ya se sabe si hay sesión (hasta entonces la barra no muestra ni «Ingresar» ni «Mi cuenta»). */
  readonly loaded: Signal<boolean>;
  readonly account: Signal<ShellAccount | null>;
  /** Cuántas versiones esperan revisión, o `null` si no se sabe. */
  readonly pendingCount: Signal<number | null>;
  refreshPending(): void;
  /** Cierra la sesión y lleva al inicio; si no pudo, se queda. */
  signOut(): Promise<void>;
  readonly signingOut: Signal<boolean>;

  /** Las especialidades con sus técnicas, para el desplegable «Especialidades». */
  readonly specialties: Signal<readonly SpecialtyEntry[]>;
  readonly specialtiesLoading: Signal<boolean>;
  retrySpecialties(): void;

  /** El `href` de un destino en esta app, o `null` si no lleva a ningún lado. */
  href(target: NavTarget): string | null;
  /**
   * Abre un destino sin recargar la página (el router de la app) y dice si lo atendió. Con `false`,
   * el clic queda para el navegador: navegación completa a otra app.
   */
  navigate(target: NavTarget): boolean;
}

export const SHELL_HOST = new InjectionToken<ShellHost>("SHELL_HOST");

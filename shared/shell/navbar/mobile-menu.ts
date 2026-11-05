import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from "@angular/core";
import { ROLE_LABELS } from "../role-labels";
import { SHELL_HOST } from "../shell-host";
import { Button } from "../ui/button/button";
import { managementLinks } from "./management-links";
import { NavLink } from "./nav-link";
import { NAV_MENUS, specialtyTarget } from "./nav-menus";

/**
 * El menú de la barra en celular (≤ 960 px): un panel a pantalla completa bajo
 * la barra con un grupo plegable por menú. Ver «Celular» en «Navigation» de
 * `DESIGN.md`. Se crea al abrirlo, así que las técnicas de cada especialidad se
 * piden entonces (y lo que falló la última vez se vuelve a pedir).
 */
@Component({
  selector: "app-mobile-menu",
  imports: [Button, NavLink],
  templateUrl: "./mobile-menu.html",
  styleUrl: "./mobile-menu.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    id: "mobile-menu",
    role: "navigation",
    "aria-label": "Menú",
    "(click)": "onClick($event)",
  },
})
export class MobileMenu {
  /** Se eligió una opción: el menú se cierra. */
  readonly chosen = output<void>();

  protected readonly menus = NAV_MENUS;
  protected readonly shell = inject(SHELL_HOST);

  protected readonly specialtyLinks = computed(() =>
    this.shell.specialties().map((specialty) => ({
      id: specialty.id,
      label: specialty.name,
      target: specialtyTarget(specialty.id),
    })),
  );

  /** El rol de la cuenta, para decir quién es (el menú «repite nombre y rol» del panel de escritorio). */
  protected readonly roleLabel = computed(() => {
    const role = this.shell.account()?.role;
    return role ? ROLE_LABELS[role] : "";
  });
  /** Los accesos del rol, cada uno con su cifra (`null` si no lleva o aún no se sabe). */
  protected readonly links = computed(() => {
    const role = this.shell.account()?.role;
    const url = this.shell.currentUrl().split(/[?#]/)[0];
    return (role ? managementLinks(role) : []).map((link) => ({
      ...link,
      active: url === link.route || url.startsWith(`${link.route}/`),
      count:
        link.counter === "pending_reviews" ? this.shell.pendingCount() : null,
    }));
  });

  constructor() {
    this.shell.retrySpecialties();
    // El menú se crea al abrirse: cada vez que se abre, la cifra se pide de nuevo
    this.shell.refreshPending();
  }

  /** Cierra la sesión y el menú; `SignOut` lleva al inicio si salió. */
  protected exit(): void {
    void this.shell.signOut();
    this.chosen.emit();
  }

  protected onClick(event: Event): void {
    if ((event.target as Element).closest("a")) this.chosen.emit();
  }
}

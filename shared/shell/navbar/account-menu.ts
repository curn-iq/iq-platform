import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from "@angular/core";
import { ROLE_LABELS } from "../role-labels";
import { SHELL_HOST, type ShellAccount } from "../shell-host";
import { Avatar } from "../ui/avatar/avatar";
import { managementLinks } from "./management-links";
import { NavLink } from "./nav-link";

/**
 * El panel de «Mi cuenta»: quién es la persona, su rol y los accesos de gestión
 * que el rol permite, y al final «Cerrar sesión». Lo dibuja `Navbar` en un overlay anclado a la
 * derecha, bajo la barra. Ver «Mi cuenta (menú)» en `DESIGN.md`.
 */
@Component({
  selector: "app-account-menu",
  imports: [Avatar, NavLink],
  templateUrl: "./account-menu.html",
  styleUrl: "./account-menu.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    id: "account-menu",
    role: "region",
    "aria-label": "Mi cuenta",
    "(click)": "onClick($event)",
  },
})
export class AccountMenu {
  protected readonly shell = inject(SHELL_HOST);

  readonly account = input.required<ShellAccount>();
  /** Se eligió un acceso o se salió: el panel se cierra. */
  readonly chosen = output<void>();

  protected readonly roleLabel = computed(
    () => ROLE_LABELS[this.account().role],
  );
  /** Los accesos del rol, cada uno con su cifra (`null` si no lleva o aún no se sabe). */
  protected readonly links = computed(() =>
    managementLinks(this.account().role).map((link) => ({
      ...link,
      count:
        link.counter === "pending_reviews" ? this.shell.pendingCount() : null,
      active: isActive(this.shell.currentUrl(), link.route),
    })),
  );

  constructor() {
    // El panel se crea al abrirse: cada vez que se abre, la cifra se pide de nuevo
    this.shell.refreshPending();
  }

  /** Cierra la sesión y el panel; `SignOut` lleva al inicio si salió. */
  protected exit(): void {
    void this.shell.signOut();
    this.chosen.emit();
  }

  protected onClick(event: Event): void {
    if ((event.target as Element).closest("a")) this.chosen.emit();
  }
}

/** El acceso está abierto: la ruta de la app es la suya o una de sus subrutas. */
function isActive(url: string, route: string): boolean {
  const path = url.split(/[?#]/)[0];
  return path === route || path.startsWith(`${route}/`);
}

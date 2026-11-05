import { computed, Directive, inject, input } from "@angular/core";
import { SHELL_HOST } from "../shell-host";
import type { NavTarget } from "./nav-menus";

/**
 * Un enlace de la barra, del menú de celular o del pie a su `NavTarget`. Cómo se abre lo decide la
 * app donde está (`ShellHost`): una ruta de esta app la abre el router, sin recargar; un `href` es
 * otra app y se deja al navegador, con navegación completa (Resuelto 17 de
 * `dataiq/docs/checklist-frontend.md`). Así esa regla vive en un solo lugar.
 */
@Directive({
  selector: "a[appNavLink]",
  host: {
    "[attr.href]": "href()",
    "(click)": "onClick($event)",
  },
})
export class NavLink {
  readonly target = input.required<NavTarget>({ alias: "appNavLink" });

  private readonly host = inject(SHELL_HOST);

  protected readonly href = computed(() => this.host.href(this.target()));

  // Como `routerLink`: con otro botón o con una tecla modificadora (p. ej. abrir en
  // otra pestaña), el clic queda para el navegador.
  protected onClick(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey)
      return;
    if (this.host.navigate(this.target())) event.preventDefault();
  }
}

import { LocationStrategy } from '@angular/common';
import { computed, Directive, inject, input } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import type { NavTarget } from './nav-menus';

/**
 * Un enlace de la barra, del menú de celular o del pie a su `NavTarget`. Una
 * ruta de esta app (con su fragmento y sus parámetros) la abre el router, como
 * `routerLink`; un `href` es otra app y se deja al navegador, con navegación
 * completa (Resuelto 17 de `dataiq/docs/checklist-frontend.md`). Así esa regla
 * vive en un solo lugar.
 */
@Directive({
  selector: 'a[appNavLink]',
  host: {
    '[attr.href]': 'href()',
    '(click)': 'onClick($event)',
  },
})
export class NavLink {
  readonly target = input.required<NavTarget>({ alias: 'appNavLink' });

  private readonly router = inject(Router);
  private readonly locationStrategy = inject(LocationStrategy);

  private readonly urlTree = computed<UrlTree | null>(() => {
    const { route, fragment, queryParams } = this.target();
    return route === undefined
      ? null
      : this.router.createUrlTree([route], { fragment, queryParams });
  });

  protected readonly href = computed(() => {
    const tree = this.urlTree();
    return tree === null
      ? (this.target().href ?? null)
      : this.locationStrategy.prepareExternalUrl(this.router.serializeUrl(tree));
  });

  // Como `routerLink`: con otro botón o con una tecla modificadora (p. ej. abrir en
  // otra pestaña), el clic queda para el navegador.
  protected onClick(event: MouseEvent): void {
    const tree = this.urlTree();
    if (tree === null || event.button !== 0) return;
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    void this.router.navigateByUrl(tree);
  }
}

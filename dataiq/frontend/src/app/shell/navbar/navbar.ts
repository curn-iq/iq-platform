import type { OverlayRef } from '@angular/cdk/overlay';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { CATALOG_ROUTE, NAV_MENUS, NavMenu, NavMenuId } from './nav-menus';

/**
 * La barra superior: la marca y cuatro menús (Herramientas, Especialidades,
 * ¿Por qué IQ Platform?, Ayuda). Cada botón abre su desplegable, un overlay de
 * CDK a todo el ancho bajo la barra; solo hay uno abierto a la vez y se cierra
 * con Escape, con un clic fuera o al elegir una opción. Ver «Navigation» en
 * `DESIGN.md`.
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly nav = viewChild.required<ElementRef<HTMLElement>>('nav');
  private panel: OverlayRef | null = null;
  // Cuenta las aperturas y los cierres: una apertura que aún carga el overlay se cancela si pasó otra.
  private requests = 0;

  protected readonly menus = NAV_MENUS;
  /** El menú abierto, si hay uno. */
  protected readonly open = signal<NavMenuId | null>(null);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** El menú de la sección donde se está: «Especialidades» en el catálogo y el detalle de técnica. */
  protected readonly current = computed<NavMenuId | null>(() => {
    const path = this.url().split(/[?#]/)[0];
    return path === CATALOG_ROUTE || path.startsWith(`${CATALOG_ROUTE}/`) ? 'specialties' : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  /**
   * Un clic abre el desplegable del botón (y cierra el que hubiera). Con el
   * desplegable abierto, un segundo clic lo cierra o, si el menú tiene página
   * propia (Especialidades), lleva a ella.
   */
  protected toggle(menu: NavMenu, event: MouseEvent): void {
    if (this.open() !== menu.id) {
      // `detail` es 0 cuando el clic viene del teclado (Enter o espacio).
      void this.show(menu, event.detail === 0);
    } else if (menu.destination) {
      this.close();
      void this.router.navigateByUrl(menu.destination);
    } else {
      this.close();
    }
  }

  // El overlay de CDK y el desplegable se cargan al abrir el primero: la barra está en
  // todas las páginas y no deben pesar en el código inicial.
  private async show(menu: NavMenu, focusFirstLink: boolean): Promise<void> {
    const request = ++this.requests;
    this.dispose();
    this.open.set(menu.id);

    const [{ Overlay }, { ComponentPortal }, { NavPanel }] = await Promise.all([
      import('@angular/cdk/overlay'),
      import('@angular/cdk/portal'),
      import('./nav-panel'),
    ]);
    if (request !== this.requests) return;

    const overlay = this.injector.get(Overlay);
    const ref = overlay.create({
      positionStrategy: overlay.position().global().top('var(--size-navbar)'),
      width: '100%',
    });
    const panel = ref.attach(new ComponentPortal(NavPanel, null, this.injector));
    panel.setInput('menu', menu);
    panel.instance.chosen.subscribe(() => this.close());
    panel.changeDetectorRef.detectChanges();

    ref
      .keydownEvents()
      .pipe(filter((event) => event.key === 'Escape'))
      .subscribe((event) => {
        event.preventDefault();
        this.close({ returnFocus: true });
      });
    // Un clic en la barra lo atiende cada botón (abrir, cambiar o cerrar).
    ref.outsidePointerEvents().subscribe((event) => {
      if (!this.nav().nativeElement.contains(event.target as Node)) this.close();
    });

    this.panel = ref;
    // El desplegable queda al final del documento: con el teclado, el foco entra a él.
    if (focusFirstLink) panel.location.nativeElement.querySelector('a')?.focus();
  }

  private close(options: { returnFocus?: boolean } = {}): void {
    const id = this.open();
    this.requests++;
    this.dispose();
    this.open.set(null);
    if (options.returnFocus && id) {
      this.nav().nativeElement.querySelector<HTMLElement>(`[data-menu="${id}"]`)?.focus();
    }
  }

  private dispose(): void {
    this.panel?.dispose();
    this.panel = null;
  }
}

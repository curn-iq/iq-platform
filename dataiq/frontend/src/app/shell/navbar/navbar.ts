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
import { SessionService } from '../../core/session/session.service';
import type { Account } from '../../data/api/models';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { Button } from '../../shared/ui/button/button';
import { MobileMenu } from './mobile-menu';
import { CATALOG_ROUTE, NAV_MENUS, NavMenu, NavMenuId } from './nav-menus';

/** Lo que puede tener abierto la barra: uno de sus cuatro menús o «Mi cuenta». */
type PanelId = NavMenuId | 'account';

/**
 * La barra superior: la marca, cuatro menús (Herramientas, Especialidades,
 * ¿Por qué IQ Platform?, Ayuda) y, a la derecha, Ingresar y Crear cuenta o «Mi
 * cuenta» si hay sesión. Cada botón abre su panel, un overlay de CDK; solo hay
 * uno abierto a la vez y se cierra con Escape, con un clic fuera o al elegir una
 * opción. Ver «Navigation» en `DESIGN.md`.
 */
@Component({
  selector: 'app-navbar',
  imports: [Avatar, Button, MobileMenu, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class Navbar {
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly mobileButton = viewChild.required<ElementRef<HTMLElement>>('mobileButton');
  private panel: OverlayRef | null = null;
  // Cuenta las aperturas y los cierres: una apertura que aún carga el overlay se cancela si pasó otra.
  private requests = 0;

  protected readonly session = inject(SessionService);
  protected readonly menus = NAV_MENUS;
  /** El panel abierto, si hay uno. */
  protected readonly open = signal<PanelId | null>(null);
  /** El menú de celular (≤ 960 px) está abierto. */
  protected readonly mobileOpen = signal(false);

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
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.dispose());

    // Por encima de 960 px el menú de celular se esconde: que no siga abierto para cuando
    // la ventana vuelva a angostarse.
    if (typeof matchMedia === 'function') {
      const wide = matchMedia('(min-width: 961px)');
      const onChange = (event: MediaQueryListEvent) => {
        if (event.matches) this.mobileOpen.set(false);
      };
      wide.addEventListener('change', onChange);
      destroyRef.onDestroy(() => wide.removeEventListener('change', onChange));
    }
  }

  /** Abre o cierra el menú de celular; abrirlo cierra el panel que hubiera. */
  protected toggleMobile(): void {
    if (this.mobileOpen()) {
      this.closeMobile();
    } else {
      this.close();
      this.mobileOpen.set(true);
    }
  }

  protected closeMobile(options: { returnFocus?: boolean } = {}): void {
    this.mobileOpen.set(false);
    if (options.returnFocus) this.mobileButton().nativeElement.focus();
  }

  // Los paneles de escritorio atienden su propio Escape (CDK); este es el del menú de celular.
  protected onEscape(): void {
    if (this.mobileOpen()) this.closeMobile({ returnFocus: true });
  }

  /**
   * Un clic abre el desplegable del botón (y cierra el que hubiera). Con el
   * desplegable abierto, un segundo clic lo cierra o, si el menú tiene página
   * propia (Especialidades), lleva a ella.
   */
  protected toggle(menu: NavMenu, event: MouseEvent): void {
    if (this.open() !== menu.id) {
      void this.showMenu(menu, isKeyboardClick(event));
    } else if (menu.destination) {
      this.close();
      void this.router.navigateByUrl(menu.destination);
    } else {
      this.close();
    }
  }

  /** Abre o cierra el panel de «Mi cuenta». */
  protected toggleAccount(account: Account, event: MouseEvent): void {
    if (this.open() === 'account') {
      this.close();
    } else {
      void this.showAccount(account, isKeyboardClick(event));
    }
  }

  // El overlay de CDK y los paneles se cargan al abrir el primero: la barra está en
  // todas las páginas y no deben pesar en el código inicial.
  private async showMenu(menu: NavMenu, focusFirstLink: boolean): Promise<void> {
    const request = this.begin(menu.id);
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
    this.watch(ref, panel.location.nativeElement, focusFirstLink);
  }

  private async showAccount(account: Account, focusFirstLink: boolean): Promise<void> {
    const request = this.begin('account');
    const [{ Overlay }, { ComponentPortal }, { AccountMenu }] = await Promise.all([
      import('@angular/cdk/overlay'),
      import('@angular/cdk/portal'),
      import('./account-menu'),
    ]);
    if (request !== this.requests) return;

    const overlay = this.injector.get(Overlay);
    const ref = overlay.create({
      // Anclado a la derecha y metido 4 px bajo el borde de la barra, como en el mockup.
      positionStrategy: overlay
        .position()
        .global()
        .top('calc(var(--size-navbar) - 4px)')
        .right('var(--space-gutter)'),
    });
    const panel = ref.attach(new ComponentPortal(AccountMenu, null, this.injector));
    panel.setInput('account', account);
    panel.instance.chosen.subscribe(() => this.close());
    panel.changeDetectorRef.detectChanges();
    this.watch(ref, panel.location.nativeElement, focusFirstLink);
  }

  /** Cierra lo que hubiera abierto y marca `id` como abierto; devuelve el número de esta apertura. */
  private begin(id: PanelId): number {
    const request = ++this.requests;
    this.dispose();
    this.mobileOpen.set(false);
    this.open.set(id);
    return request;
  }

  /** Escape y el clic fuera cierran el panel; con el teclado, el foco entra a él. */
  private watch(ref: OverlayRef, element: HTMLElement, focusFirstLink: boolean): void {
    ref
      .keydownEvents()
      .pipe(filter((event) => event.key === 'Escape'))
      .subscribe((event) => {
        event.preventDefault();
        this.close({ returnFocus: true });
      });
    // Un clic en un botón de la barra lo atiende ese botón (abrir, cambiar o cerrar).
    ref.outsidePointerEvents().subscribe((event) => {
      if (!(event.target as Element).closest('[data-menu]')) this.close();
    });

    this.panel = ref;
    // El panel queda al final del documento: con el teclado, el foco entra a él.
    if (focusFirstLink) element.querySelector('a')?.focus();
  }

  private close(options: { returnFocus?: boolean } = {}): void {
    const id = this.open();
    this.requests++;
    this.dispose();
    this.open.set(null);
    if (options.returnFocus && id) {
      this.host.nativeElement.querySelector<HTMLElement>(`[data-menu="${id}"]`)?.focus();
    }
  }

  private dispose(): void {
    this.panel?.dispose();
    this.panel = null;
  }
}

/** `detail` es 0 cuando el clic viene del teclado (Enter o espacio). */
function isKeyboardClick(event: MouseEvent): boolean {
  return event.detail === 0;
}

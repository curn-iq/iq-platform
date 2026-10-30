import type { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  OutputRef,
  signal,
  Type,
  untracked,
  viewChild,
} from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { SessionService } from '../../core/session/session.service';
import type { Account } from '../../data/api/models';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { BrandMark } from '../../shared/ui/brand-mark/brand-mark';
import { Button } from '../../shared/ui/button/button';
import { MobileMenu } from './mobile-menu';
import { CATALOG_ROUTE, NAV_MENUS, NavMenu, NavMenuId } from './nav-menus';

/** Lo que puede tener abierto la barra: uno de sus cuatro menús o «Mi cuenta». */
type PanelId = NavMenuId | 'account';

/** Por encima de este ancho la barra muestra sus cuatro menús; por debajo, el menú de celular. */
const WIDE_QUERY = '(min-width: 961px)';
/** Hasta este ancho la barra mide `--size-navbar-mobile` en vez de `--size-navbar` (ver `navbar.scss`). */
const COMPACT_QUERY = '(max-width: 760px)';

/** Lo que tiene todo panel de la barra: avisa cuando se eligió una opción. */
interface PanelComponent {
  readonly chosen: OutputRef<void>;
}

/**
 * La barra superior: la marca, cuatro menús (Herramientas, Especialidades,
 * ¿Por qué IQ Platform?, Ayuda) y, a la derecha, Ingresar y Crear cuenta o «Mi
 * cuenta» si hay sesión. Cada botón abre su panel, un overlay de CDK; solo hay
 * uno abierto a la vez y se cierra con Escape, con un clic fuera, al elegir una
 * opción o al cambiar de página. Ver «Navigation» en `DESIGN.md`.
 */
@Component({
  selector: 'app-navbar',
  imports: [Avatar, BrandMark, Button, MobileMenu, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class Navbar {
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
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
    this.destroyRef.onDestroy(() => this.dispose());

    // Atrás, Adelante, un guard o la sesión vencida también cambian de página, sin
    // pasar por una opción: lo que hubiera abierto se cierra.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.close();
        this.closeMobile();
      });

    // «Mi cuenta» muestra la cuenta que había al abrirlo: si la sesión cambia
    // (p. ej. vence), se cierra.
    effect(() => {
      this.session.account();
      untracked(() => {
        if (this.open() === 'account') this.close();
      });
    });

    if (typeof matchMedia === 'function') {
      // Por encima de 960 px el menú de celular se esconde, y por debajo, los botones
      // de los desplegables: lo que quede sin botón se cierra.
      this.onMediaChange(WIDE_QUERY, (wide) => {
        if (wide) {
          this.closeMobile();
        } else if (this.open() !== null && this.open() !== 'account') {
          this.close();
        }
      });
      // «Mi cuenta» se ancla a la altura de la barra, que cambia en 760 px.
      this.onMediaChange(COMPACT_QUERY, () => {
        if (this.open() === 'account') this.close();
      });
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

  /** Cierra el menú de celular; si el foco estaba en él, o con `returnFocus`, vuelve al botón. */
  protected closeMobile(options: { returnFocus?: boolean } = {}): void {
    const menu = this.host.nativeElement.querySelector('app-mobile-menu');
    const hadFocus = menu?.contains(document.activeElement) ?? false;
    this.mobileOpen.set(false);
    if (options.returnFocus || hadFocus) this.mobileButton().nativeElement.focus();
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
      void this.show(
        menu.id,
        () => import('./nav-panel').then((m) => m.NavPanel),
        (overlay) => ({
          positionStrategy: overlay.position().global().top('var(--size-navbar)'),
          width: '100%',
        }),
        { menu },
        isKeyboardClick(event),
      );
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
      return;
    }
    const compact = typeof matchMedia === 'function' && matchMedia(COMPACT_QUERY).matches;
    const navbarHeight = compact ? 'var(--size-navbar-mobile)' : 'var(--size-navbar)';
    void this.show(
      'account',
      () => import('./account-menu').then((m) => m.AccountMenu),
      (overlay) => ({
        // Anclado a la derecha y metido 4 px bajo el borde de la barra, como en el mockup.
        positionStrategy: overlay
          .position()
          .global()
          .top(`calc(${navbarHeight} - 4px)`)
          .right('var(--space-gutter)'),
      }),
      { account },
      isKeyboardClick(event),
    );
  }

  // El overlay de CDK y los paneles se cargan al abrir el primero: la barra está en
  // todas las páginas y no deben pesar en el código inicial.
  private async show<T extends PanelComponent>(
    id: PanelId,
    load: () => Promise<Type<T>>,
    config: (overlay: Overlay) => OverlayConfig,
    inputs: Readonly<Record<string, unknown>>,
    focusFirstLink: boolean,
  ): Promise<void> {
    const request = this.begin(id);
    const [{ Overlay }, { ComponentPortal }, component] = await Promise.all([
      import('@angular/cdk/overlay'),
      import('@angular/cdk/portal'),
      load(),
    ]);
    if (request !== this.requests) return;

    const overlay = this.injector.get(Overlay);
    const ref = overlay.create(config(overlay));
    const panel = ref.attach(new ComponentPortal(component, null, this.injector));
    for (const [name, value] of Object.entries(inputs)) panel.setInput(name, value);
    panel.changeDetectorRef.detectChanges();
    this.watch(ref, panel.location.nativeElement, panel.instance.chosen, focusFirstLink);
  }

  /** Cierra lo que hubiera abierto y marca `id` como abierto; devuelve el número de esta apertura. */
  private begin(id: PanelId): number {
    const request = ++this.requests;
    this.dispose();
    this.mobileOpen.set(false);
    this.open.set(id);
    return request;
  }

  /**
   * Escape, el clic fuera y elegir una opción cierran el panel; con el teclado,
   * el foco entra a él.
   */
  private watch(
    ref: OverlayRef,
    element: HTMLElement,
    chosen: OutputRef<void>,
    focusFirstLink: boolean,
  ): void {
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
    // El panel queda al final del documento, pero con Tab se recorre como si
    // estuviera justo después de su botón: Mayús+Tab desde el primer enlace vuelve
    // al botón, y Tab desde el último sigue con lo que hay después del botón.
    ref
      .keydownEvents()
      .pipe(filter((event) => event.key === 'Tab'))
      .subscribe((event) => {
        const links = element.querySelectorAll<HTMLElement>('a[href]');
        const edge = event.shiftKey ? links[0] : links[links.length - 1];
        if (edge === undefined || document.activeElement !== edge) return;
        this.close({ returnFocus: true });
        // Sin `preventDefault`, el navegador hace el Tab desde el botón, que ya tiene el foco.
        if (event.shiftKey) event.preventDefault();
      });
    chosen.subscribe(() => this.close());

    this.panel = ref;
    // El panel queda al final del documento: con el teclado, el foco entra a él.
    if (focusFirstLink) element.querySelector('a')?.focus();
  }

  /** Cierra el panel abierto; si el foco estaba en él, o con `returnFocus`, vuelve a su botón. */
  private close(options: { returnFocus?: boolean } = {}): void {
    const id = this.open();
    // Al destruir el panel, el foco que tuviera caería en `<body>`.
    const hadFocus = this.panel?.overlayElement.contains(document.activeElement) ?? false;
    this.requests++;
    this.dispose();
    this.open.set(null);
    if ((options.returnFocus || hadFocus) && id) {
      this.host.nativeElement.querySelector<HTMLElement>(`[data-menu="${id}"]`)?.focus();
    }
  }

  private dispose(): void {
    this.panel?.dispose();
    this.panel = null;
  }

  /** Avisa cada vez que `query` cambia de cumplirse a no cumplirse, o al revés, mientras viva la barra. */
  private onMediaChange(query: string, listener: (matches: boolean) => void): void {
    const media = matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => listener(event.matches);
    media.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
  }
}

/** `detail` es 0 cuando el clic viene del teclado (Enter o espacio). */
function isKeyboardClick(event: MouseEvent): boolean {
  return event.detail === 0;
}

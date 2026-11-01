import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  Injector,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { REDUCED_MOTION_QUERY, mediaQuery } from '../../media-query';
import { tabIndexAfterEvent } from './tab-keys';

/** Una pestaña: cada una es un enlace, así que la URL dice cuál está abierta. */
export interface TabItem {
  /** Identifica la pestaña; da el `id` del enlace (`tab-<key>`) y el de su hoja (`panel-<key>`). */
  readonly key: string;
  readonly label: string;
  /** A dónde lleva, como los comandos de `routerLink`. */
  readonly link: readonly unknown[];
  /** Lleva un candado: sin cuenta solo se ve una vista previa. */
  readonly locked?: boolean;
  /** `'preserve'` conserva la consulta de la URL al pasar a la pestaña (p. ej. `?volver=`). */
  readonly queryParamsHandling?: 'preserve' | 'merge';
}

/**
 * Pestañas con la raya de 2 px en `tinta` que se desliza bajo la elegida (`.45s expo`),
 * según «Detalle de técnica (página)» en `DESIGN.md`. Cada pestaña es un enlace, y
 * la hoja que muestra va en un `role="tabpanel"` con `id="panel-<key>"` y
 * `aria-labelledby="tab-<key>"`. Las flechas, Inicio y Fin pasan de una a otra; en
 * celular la tira se desplaza hasta la elegida y sus bordes se desvanecen.
 */
@Component({
  selector: 'app-tabs',
  imports: [RouterLink],
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
  host: { '(window:resize)': 'measure()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tabs {
  /** Lo que dice el grupo de pestañas para quien no lo ve. */
  readonly label = input.required<string>();
  readonly tabs = input.required<readonly TabItem[]>();
  /** El `key` de la pestaña abierta. */
  readonly current = input.required<string>();

  protected readonly currentIndex = computed(() =>
    this.tabs().findIndex((tab) => tab.key === this.current()),
  );

  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly reduced = mediaQuery(REDUCED_MOTION_QUERY);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private readonly links = viewChildren<ElementRef<HTMLAnchorElement>>('tab');

  protected readonly lineLeft = signal(0);
  protected readonly lineWidth = signal(0);
  /** La raya no se anima hasta que se colocó por primera vez. */
  protected readonly lineReady = signal(false);
  private readonly remeasured = signal(0);

  constructor() {
    afterRenderEffect(() => {
      // Se vuelve a colocar al cambiar de pestaña, al cambiar el tamaño o al cargar la letra
      this.currentIndex();
      this.remeasured();
      this.links();
      this.place();
    });
    afterNextRender(() => {
      // El ancho de cada pestaña cambia cuando la tipografía termina de cargar
      document.fonts?.ready.then(() => this.measure());
    });
  }

  protected measure(): void {
    this.remeasured.update((count) => count + 1);
  }

  protected select(event: KeyboardEvent, index: number): void {
    const target = tabIndexAfterEvent(index, event, this.tabs().length);
    if (target === null) return;
    event.preventDefault();
    // El enlace es el mismo elemento antes y después de navegar: el foco puede pasar ya
    this.links()[target].nativeElement.focus();
    const { link, queryParamsHandling } = this.tabs()[target];
    void (queryParamsHandling
      ? this.router.navigate([...link], { queryParamsHandling })
      : this.router.navigate([...link]));
  }

  private place(): void {
    const link = this.links()[this.currentIndex()]?.nativeElement;
    if (!link) return;
    this.lineLeft.set(link.offsetLeft);
    this.lineWidth.set(link.offsetWidth);
    const list = this.list().nativeElement;
    if (list.scrollWidth > list.clientWidth && typeof list.scrollTo === 'function') {
      list.scrollTo({
        left: Math.max(0, link.offsetLeft - 24),
        behavior: this.reduced() ? 'auto' : 'smooth',
      });
    }
    if (!this.lineReady()) {
      // Se deja pintar la primera posición sin transición antes de activarla
      afterNextRender(() => this.lineReady.set(true), { injector: this.injector });
    }
  }
}

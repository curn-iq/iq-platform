import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { REDUCED_MOTION_QUERY, mediaQuery } from '../../../shared/media-query';
import { ArrowLink } from '../../../shared/ui/arrow-link/arrow-link';
import { currentStep, railOffset, railProgress, stepFill } from '../rail-scroll';
import { DataiqWindow } from './dataiq-window';
import { Simiq3dWindow } from './simiq3d-window';
import { SivriWindow } from './sivri-window';

/** Desde este ancho el carril se recorre con el scroll de la página; por debajo, con el dedo. */
const HORIZONTAL_QUERY = '(min-width: 761px)';

interface Product {
  id: 'dataiq' | 'simiq3d' | 'sivri';
  name: string;
  tagline: string;
  capabilities: readonly string[];
  link: string;
  /** Una ruta de esta app, o la dirección de otra app (navegación completa, Resuelto 17). */
  route?: string;
  href?: string;
}

// Los textos son los de `diseno/mockups/inicio.html`. «Conocer…» lleva a la herramienta,
// como el menú Herramientas (decidido por Juan el 2026-10-31).
const PRODUCTS: readonly Product[] = [
  {
    id: 'dataiq',
    name: 'DataIQ',
    tagline: 'Cada técnica, con su instrumental y su mesa.',
    capabilities: [
      'Buscar por nombre o especialidad',
      'Mesa de Mayo y de reserva, pieza por pieza',
      'Datos clínicos, suturas y equipos',
    ],
    link: 'Conocer DataIQ',
    route: '/tecnicas',
  },
  {
    id: 'simiq3d',
    name: 'SIMIQ3D',
    tagline: 'La mesa en 3D, a una pregunta de distancia.',
    capabilities: [
      'Pedir cualquier técnica conversando',
      'Girar y recorrer la mesa',
      'Tocar una pieza para ver qué es',
    ],
    link: 'Conocer SIMIQ3D',
    href: '/simiq3d/',
  },
  {
    id: 'sivri',
    name: 'SIVRI',
    tagline: 'La cámara revisa la mesa armada.',
    capabilities: [
      'Reconoce el instrumental en tiempo real',
      'Lo compara con la técnica elegida',
      'Señala qué hay que mover',
    ],
    link: 'Conocer SIVRI',
    href: '/sivri/',
  },
];

/**
 * «Tres formas de recorrer una técnica» (id `camino`): DataIQ, SIMIQ3D y SIVRI de
 * lado a lado, cada uno con su lema, sus capacidades, su enlace y su ventana. En
 * escritorio la sección queda fija bajo la barra y el carril se traslada
 * horizontalmente con el scroll, con tres trazos de progreso; en celular (y con
 * movimiento reducido) el carril es un desplazamiento horizontal con
 * `scroll-snap`. Ver «Carril» en `DESIGN.md`.
 */
@Component({
  selector: 'app-home-products',
  imports: [ArrowLink, DataiqWindow, RouterLink, Simiq3dWindow, SivriWindow],
  templateUrl: './products.html',
  styleUrl: './products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeProducts {
  protected readonly products = PRODUCTS;

  private readonly desktop = mediaQuery(HORIZONTAL_QUERY);
  private readonly reduced = mediaQuery(REDUCED_MOTION_QUERY);
  /** El carril se traslada con el scroll; si no, se desplaza con el dedo. */
  protected readonly horizontal = computed(() => this.desktop() && !this.reduced());

  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly rail = viewChild.required<ElementRef<HTMLElement>>('rail');

  /** Cuánto sobresale el carril de la ventana, y el alto de esta; 0 mientras no se miden. */
  private readonly excess = signal(0);
  private readonly viewport = signal(0);
  protected readonly progress = signal(0);

  /** La sección mide el alto de la ventana más lo que hay que recorrer. */
  protected readonly sectionHeight = computed(() =>
    this.horizontal() && this.viewport() > 0 ? this.viewport() + this.excess() : null,
  );
  protected readonly railTransform = computed(() =>
    this.horizontal()
      ? `translate3d(${-railOffset(this.progress(), this.excess())}px, 0, 0)`
      : null,
  );
  protected readonly current = computed(() => currentStep(this.progress()));

  protected fill(index: number): number {
    return stepFill(this.progress(), index);
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      let pending = false;
      const onScroll = () => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          this.update();
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', this.measure);
      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', this.measure);
      });
      // El ancho del carril cambia cuando carga la fuente
      void document.fonts?.ready.then(this.measure);
      this.measure();
    });
  }

  /** Mide lo que sobresale el carril y la ventana, y recoloca el recorrido. */
  private readonly measure = (): void => {
    this.viewport.set(window.innerHeight);
    this.excess.set(Math.max(0, this.rail().nativeElement.scrollWidth - window.innerWidth));
    this.update();
  };

  /**
   * Cuánto del recorrido va, según lo que la sección lleva subido. La sección mide el
   * alto de la ventana más lo que sobresale el carril, así que lo que hay que
   * recorrer es justo ese exceso.
   */
  update(): void {
    if (!this.horizontal()) {
      this.progress.set(0);
      return;
    }
    const top = this.section().nativeElement.getBoundingClientRect().top;
    this.progress.set(railProgress(top, this.excess()));
  }
}

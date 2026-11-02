import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { StepSummary } from '../../../../domain/step-summary';
import { REDUCED_MOTION_QUERY, mediaQuery } from '../../../../shared/media-query';
import { ProgressMark } from '../../../../shared/ui/progress-mark/progress-mark';

/** Un paso de la fila: su resumen (marca y lo que falta) y lo que dice. */
export interface EditorStepItem extends StepSummary {
  label: string;
}

/**
 * La fila de cinco pasos del editor, según «Editor de técnica (página)» de `DESIGN.md`: una rejilla de
 * cinco columnas separadas por filete. Cada paso es un enlace (la URL dice cuál está abierto, así que
 * Atrás lo recuerda) con su marca de 22 px, su número en `tinta-3`, su nombre en 600 (650 el abierto) y
 * lo que falta en 14 px `tinta-3`; bajo el abierto se desliza la raya de 2 px en `tinta`. Cuando un paso
 * cambia de estado, su marca se traza de nuevo. En celular son una tira que se desplaza hasta el abierto.
 */
@Component({
  selector: 'app-editor-steps',
  imports: [ProgressMark, RouterLink],
  templateUrl: './editor-steps.html',
  styleUrl: './editor-steps.scss',
  host: { '(window:resize)': 'measure()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorSteps {
  readonly steps = input.required<readonly EditorStepItem[]>();
  /** El `id` de la versión, para los enlaces de cada paso. */
  readonly versionId = input.required<string>();
  /** El `slug` del paso abierto. */
  readonly current = input.required<string>();

  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly reduced = mediaQuery(REDUCED_MOTION_QUERY);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private readonly links = viewChildren<ElementRef<HTMLAnchorElement>>('link');

  protected readonly currentIndex = computed(() =>
    this.steps().findIndex((step) => step.slug === this.current()),
  );

  protected readonly lineLeft = signal(0);
  protected readonly lineWidth = signal(0);
  /** La raya no se anima hasta que se colocó por primera vez. */
  protected readonly lineReady = signal(false);
  private readonly remeasured = signal(0);
  private seen = false;

  constructor() {
    afterRenderEffect(() => {
      // Se vuelve a colocar al cambiar de paso, al cambiar el tamaño o al cargar la letra
      this.currentIndex();
      this.remeasured();
      this.links();
      this.place();
    });
    afterNextRender(() => {
      // El ancho de cada paso cambia cuando la tipografía termina de cargar
      document.fonts?.ready.then(() => this.measure());
    });
    effect(() => {
      // Al pasar de un paso a otro con la fila fuera de la vista, se vuelve a ella
      this.current();
      if (this.seen) afterNextRender(() => this.revealIfAbove(), { injector: this.injector });
      this.seen = true;
    });
  }

  protected measure(): void {
    this.remeasured.update((count) => count + 1);
  }

  private place(): void {
    const link = this.links()[this.currentIndex()]?.nativeElement;
    const item = link?.parentElement;
    if (!link || !item) return;
    this.lineLeft.set(item.offsetLeft);
    this.lineWidth.set(item.offsetWidth);
    const list = this.list().nativeElement;
    if (list.scrollWidth > list.clientWidth && typeof list.scrollTo === 'function') {
      list.scrollTo({
        left: Math.max(0, item.offsetLeft - 20),
        behavior: this.reduced() ? 'auto' : 'smooth',
      });
    }
    if (!this.lineReady()) {
      // Se deja pintar la primera posición sin transición antes de activarla
      afterNextRender(() => this.lineReady.set(true), { injector: this.injector });
    }
  }

  private revealIfAbove(): void {
    const element = this.host.nativeElement;
    if (typeof element.scrollIntoView !== 'function') return;
    if (element.getBoundingClientRect().top < 0) {
      element.scrollIntoView({ block: 'start', behavior: this.reduced() ? 'auto' : 'smooth' });
    }
  }
}

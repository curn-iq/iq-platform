import { IMAGE_LOADER, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { swipeStep, wrapIndex } from '../../../domain/carousel';
import { mediaQuery, REDUCED_MOTION_QUERY } from '../../../shared/media-query';
import { aboutImageLoader, AboutPhoto, CAROUSEL_SRCSET } from '../about-photos';

/** Cada cuánto avanza sola. */
const INTERVAL_MS = 3000;

/** Lo que tarda la foto en terminar de entrar (o en volver) al soltarla tras arrastrarla. */
const SETTLE_MS = 350;

/** Lo que se ve de la foto mientras el navegador elige su variante: el ancho que ocupa en cada rango. */
const SIZES = '(width > 1100px) 100vw, (width > 760px) calc(100vw - 72px), calc(100vw - 40px)';

/**
 * El carrusel de la presentación de «Nosotros»: solo las fotos, sin flechas, contador, puntos ni pie
 * (Resuelto 67 de `dataiq/docs/checklist-frontend.md`). Avanza solo cada 3 s con un fundido de .6s y se
 * detiene con el puntero encima, con el foco del teclado y mientras se arrastra; deja de avanzar solo
 * cuando la persona cambia de foto con las flechas o deslizando con el dedo (con el mouse sigue); se cambia de foto arrastrando con el
 * mouse o deslizando, en los dos sentidos (las fotos siguen al puntero mientras se arrastran), y con las
 * flechas del teclado cuando tiene el foco. Con
 * `prefers-reduced-motion` no avanza solo y el cambio es instantáneo. Ver «Nosotros (página)» en
 * `DESIGN.md`.
 */
@Component({
  selector: 'app-photo-carousel',
  imports: [NgOptimizedImage],
  templateUrl: './photo-carousel.html',
  styleUrl: './photo-carousel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: IMAGE_LOADER, useValue: aboutImageLoader(1500) }],
  host: {
    role: 'region',
    'aria-roledescription': 'carrusel',
    tabindex: '0',
    '[attr.aria-label]': 'label()',
    '[class.dragging]': 'dragging()',
    '[class.settling]': 'settling()',
    '(keydown.arrowleft)': 'onArrow($event, -1)',
    '(keydown.arrowright)': 'onArrow($event, 1)',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel()',
    '(lostpointercapture)': 'onLostPointerCapture()',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'focusVisible.set(false)',
    '(dragstart)': '$event.preventDefault()',
  },
})
export class PhotoCarousel {
  readonly photos = input.required<readonly AboutPhoto[]>();
  /** El nombre de la región, para un lector de pantalla. */
  readonly label = input.required<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reduced = mediaQuery(REDUCED_MOTION_QUERY);
  /** Donde se agarró la foto con el puntero, si se está arrastrando. */
  private dragFrom: number | null = null;
  /** El puntero que arrastra: otro dedo que se apoye no cambia el arrastre. */
  private dragPointer: number | null = null;
  /** Se está arrastrando con el dedo (y no con el mouse o un lápiz). */
  private dragByTouch = false;
  /** El temporizador de la foto que termina de entrar tras soltarla. */
  private settleTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly srcset = CAROUSEL_SRCSET;
  protected readonly sizes = SIZES;
  /** La foto que se ve. */
  protected readonly index = signal(0);
  protected readonly dragging = signal(false);
  /** Se soltó la foto y está terminando de entrar o de volver a su lugar. */
  protected readonly settling = signal(false);
  /** Las fotos vecinas, que asoman a los lados mientras se arrastra. */
  protected readonly previous = computed(() => wrapIndex(this.index() - 1, this.photos().length));
  protected readonly next = computed(() => wrapIndex(this.index() + 1, this.photos().length));
  /** El puntero (de mouse o lápiz, no el dedo) está encima. */
  private readonly hovering = signal(false);
  /** El foco llegó con el teclado. */
  protected readonly focusVisible = signal(false);
  /**
   * Se cambió de foto con las flechas o deslizando con el dedo: deja de avanzar solo hasta que se
   * recargue la página. Es la forma de detenerlo en una pantalla táctil, donde no hay puntero encima
   * (WCAG 2.2.2). Con el mouse no lo detiene: ahí el puntero encima ya lo pausa.
   */
  private readonly stopped = signal(false);
  private readonly paused = computed(
    () =>
      this.stopped() ||
      this.hovering() ||
      this.focusVisible() ||
      this.dragging() ||
      this.settling(),
  );

  constructor() {
    // Cada cambio de foto, o dejar de estar en pausa, empieza a contar los 3 s de nuevo.
    effect((onCleanup) => {
      this.index();
      if (this.reduced() || this.paused() || this.photos().length < 2) return;
      const timer = setTimeout(() => this.go(1), INTERVAL_MS);
      onCleanup(() => clearTimeout(timer));
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.settleTimer));
  }

  /** La clase de vecina solo va si esa foto no es la actual ni la otra vecina (con 1 o 2 fotos coinciden). */
  protected isPrevious(i: number): boolean {
    return i === this.previous() && i !== this.index();
  }

  protected isNext(i: number): boolean {
    return i === this.next() && i !== this.index() && i !== this.previous();
  }

  private go(step: number): void {
    this.index.update((index) => wrapIndex(index + step, this.photos().length));
  }

  /** Un cambio con las flechas o con el dedo: cambia de foto y el carrusel deja de avanzar solo. */
  private goByHand(step: number): void {
    this.stopped.set(true);
    this.go(step);
  }

  protected onArrow(event: Event, step: -1 | 1): void {
    event.preventDefault();
    // Mientras la foto termina de entrar, el cambio ya está en camino
    if (this.settling()) return;
    this.goByHand(step);
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'touch') this.hovering.set(true);
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== 'touch') this.hovering.set(false);
  }

  protected onFocusIn(): void {
    // Un clic también da el foco; solo el del teclado pausa (el clic ya lo pausa el puntero encima)
    let visible = true;
    try {
      visible = this.host.matches(':focus-visible');
    } catch {
      // sin `:focus-visible`, se da por visible
    }
    this.focusVisible.set(visible);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch' && event.button !== 0) return;
    // Un segundo dedo no empieza otro arrastre; con una sola foto no hay a dónde arrastrar
    if (event.isPrimary === false || this.dragFrom !== null) return;
    if (this.settling() || this.photos().length < 2) return;
    this.dragFrom = event.clientX;
    this.dragPointer = event.pointerId ?? null;
    this.dragByTouch = event.pointerType === 'touch';
    this.dragging.set(true);
    // El arrastre sigue aunque el puntero salga de la foto
    this.host.setPointerCapture?.(event.pointerId);
  }

  /**
   * Mientras se arrastra, las fotos se corren con el puntero. Solo cambia una propiedad CSS del carrusel
   * (`--drag`, que mueve las fotos con `transform`): no pasa por Angular ni obliga a recalcular la página.
   */
  protected onPointerMove(event: PointerEvent): void {
    if (this.dragFrom === null || !this.isDragPointer(event) || this.reduced()) return;
    this.setDrag(`${event.clientX - this.dragFrom}px`);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.dragFrom === null || !this.isDragPointer(event)) return;
    const step = swipeStep(event.clientX - this.dragFrom);
    this.dragFrom = null;
    this.dragPointer = null;
    this.dragging.set(false);
    if (this.reduced()) {
      this.setDrag('0px');
      if (step !== 0) this.changeAfterDrag(step);
      return;
    }
    // La foto termina de entrar (o vuelve a su lugar) y después se cambia el índice
    this.settling.set(true);
    this.setDrag(`${-step * 100}%`);
    this.settleTimer = setTimeout(() => {
      if (step !== 0) this.changeAfterDrag(step);
      this.setDrag('0px');
      this.settling.set(false);
    }, SETTLE_MS);
  }

  protected onPointerCancel(): void {
    this.dragFrom = null;
    this.dragPointer = null;
    this.dragging.set(false);
    this.setDrag('0px');
  }

  /** Se perdió la captura sin soltar (p. ej. al cambiar de ventana): el arrastre se cancela. */
  protected onLostPointerCapture(): void {
    if (this.dragFrom !== null) this.onPointerCancel();
  }

  private isDragPointer(event: PointerEvent): boolean {
    return (event.pointerId ?? null) === this.dragPointer;
  }

  /** Con el dedo, cambiar de foto detiene el avance; con el mouse sigue 3 s después de la foto nueva. */
  private changeAfterDrag(step: number): void {
    if (this.dragByTouch) this.goByHand(step);
    else this.go(step);
  }

  private setDrag(value: string): void {
    this.host.style.setProperty('--drag', value);
  }
}

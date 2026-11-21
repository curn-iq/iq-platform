import { IMAGE_LOADER, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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

/** Lo que se ve de la foto mientras el navegador elige su variante: el ancho que ocupa en cada rango. */
const SIZES =
  '(min-width: 1101px) 100vw, (min-width: 761px) calc(100vw - 72px), calc(100vw - 40px)';

/**
 * El carrusel de la presentación de «Nosotros»: solo las fotos, sin flechas, contador, puntos ni pie
 * (Resuelto 67 de `dataiq/docs/checklist-frontend.md`). Avanza solo cada 3 s con un fundido de .6s y se
 * detiene con el puntero encima o con el foco del teclado; se cambia de foto arrastrando con el
 * mouse o deslizando, en los dos sentidos, y con las flechas del teclado cuando tiene el foco. Con
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
    '(keydown.arrowleft)': 'onArrow($event, -1)',
    '(keydown.arrowright)': 'onArrow($event, 1)',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel()',
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

  protected readonly srcset = CAROUSEL_SRCSET;
  protected readonly sizes = SIZES;
  /** La foto que se ve. */
  protected readonly index = signal(0);
  protected readonly dragging = signal(false);
  /** El puntero (de mouse o lápiz, no el dedo) está encima. */
  private readonly hovering = signal(false);
  /** El foco llegó con el teclado. */
  protected readonly focusVisible = signal(false);
  private readonly paused = computed(() => this.hovering() || this.focusVisible());

  constructor() {
    // Cada cambio de foto, o dejar de estar pausado, empieza a contar los 3 s de nuevo.
    effect((onCleanup) => {
      this.index();
      if (this.reduced() || this.paused() || this.photos().length < 2) return;
      const timer = setTimeout(() => this.go(1), INTERVAL_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  private go(step: number): void {
    this.index.update((index) => wrapIndex(index + step, this.photos().length));
  }

  protected onArrow(event: Event, step: -1 | 1): void {
    event.preventDefault();
    this.go(step);
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
    this.dragFrom = event.clientX;
    this.dragging.set(true);
    // El arrastre sigue aunque el puntero salga de la foto
    this.host.setPointerCapture?.(event.pointerId);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.dragFrom === null) return;
    const step = swipeStep(event.clientX - this.dragFrom);
    this.onPointerCancel();
    if (step !== 0) this.go(step);
  }

  protected onPointerCancel(): void {
    this.dragFrom = null;
    this.dragging.set(false);
  }
}

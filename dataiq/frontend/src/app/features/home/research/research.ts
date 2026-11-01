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
import { MOBILE_QUERY, REDUCED_MOTION_QUERY, mediaQuery } from '../../../shared/media-query';
import {
  ACHIEVEMENTS,
  BEAM_LENGTH,
  COMPLETE_AT,
  createMotes,
  CYCLE,
  GEOMETRY,
  LAPS,
  motePosition,
  spiralFrame,
  stepMotes,
  type Mote,
} from './spiral';

interface MoteView {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

/** Cuánto dura como máximo un cuadro para las motas: si la pestaña estuvo oculta, no saltan. */
const MAX_FRAME = 48;

function toViews(motes: readonly Mote[]): MoteView[] {
  return motes.map((mote) => {
    const [x, y] = motePosition(mote);
    return { x, y, radius: mote.radius, opacity: mote.opacity };
  });
}

/**
 * «Con respuesta inmediata, se aprende antes.» (id `investigacion`): tres
 * conclusiones de la investigación a la izquierda y, a la derecha, la espiral de
 * luz que sube cada vez más rápido y suma un logro por vuelta. La animación corre
 * solo mientras se ve y, con movimiento reducido, se queda quieta en su dibujo
 * completo. En celular los logros van como lista bajo la espiral. Ver
 * `spiral.ts` y «Layout» en `DESIGN.md`.
 */
@Component({
  selector: 'app-home-research',
  templateUrl: './research.html',
  styleUrl: './research.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeResearch {
  protected readonly geometry = GEOMETRY;
  protected readonly achievements = ACHIEVEMENTS;
  protected readonly lastAchievement = LAPS;
  protected readonly beamLength = BEAM_LENGTH;

  private readonly narrow = mediaQuery(MOBILE_QUERY);
  private readonly reduced = mediaQuery(REDUCED_MOTION_QUERY);
  /** En celular se recorta el lienzo y los logros salen de él. */
  protected readonly viewBox = computed(() => (this.narrow() ? '110 40 500 540' : '0 0 900 640'));

  /** Hasta que se ve, y con movimiento reducido, el dibujo completo y quieto. */
  protected readonly frame = signal(spiralFrame(COMPLETE_AT));

  private motes = stepMotes(createMotes(), 0, 0);
  protected readonly moteViews = signal<MoteView[]>(toViews(this.motes));

  private readonly figure = viewChild.required<ElementRef<HTMLElement>>('figure');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (this.reduced() || typeof IntersectionObserver === 'undefined') return;
      let running = false;
      let frameId = 0;
      let start = 0;
      let last = 0;

      const loop = (now: number) => {
        if (!running) return;
        if (!start) start = now;
        let elapsed = now - start;
        if (elapsed >= CYCLE) {
          start = now;
          elapsed = 0;
        }
        const frame = spiralFrame(elapsed);
        this.frame.set(frame);
        const boost = frame.progress > 0 && frame.progress < 1 ? frame.progress : 0;
        this.motes = stepMotes(this.motes, Math.min(MAX_FRAME, now - (last || now)), boost);
        this.moteViews.set(toViews(this.motes));
        last = now;
        frameId = requestAnimationFrame(loop);
      };

      // Corre solo mientras se ve: no gasta cuadros fuera de la pantalla
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !running) {
              running = true;
              start = 0;
              last = 0;
              frameId = requestAnimationFrame(loop);
            } else if (!entry.isIntersecting) {
              running = false;
              cancelAnimationFrame(frameId);
            }
          }
        },
        { threshold: 0.3 },
      );
      observer.observe(this.figure().nativeElement);
      destroyRef.onDestroy(() => {
        running = false;
        cancelAnimationFrame(frameId);
        observer.disconnect();
      });
    });
  }
}

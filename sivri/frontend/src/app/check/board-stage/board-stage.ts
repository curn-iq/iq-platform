import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  boxToRect,
  coverLayout,
  isVisible,
  pointToPixels,
  type Rect,
  type Size,
} from '../../domain/geometry';
import type { SentFrame } from '../../camera/sent-frames';
import type { Mark } from './marks';

/** Lo que se dibuja de cada marca, ya en píxeles del escenario. */
interface Drawn {
  readonly key: string;
  readonly kind: Mark['kind'];
  readonly rect: Rect;
  readonly text: string | null;
  /** La etiqueta va debajo de la caja si arriba no cabe. */
  readonly below: boolean;
}

interface Arrow {
  readonly from: { x: number; y: number };
  readonly to: { x: number; y: number };
  /** Los dos trazos de la punta. */
  readonly head: string;
  readonly labelAt: { x: number; y: number };
}

/** Cuánto mide la flecha de una pieza por mover (px): da la dirección, no la distancia. */
const ARROW_LENGTH = 76;

/**
 * El escenario de la cámara: el video en vivo (`live`) o el cuadro que se mandó (`frozen`),
 * recortado a lo que cabe (`object-fit: cover`), con las marcas encima. Alrededor, el radial
 * claro de `DESIGN.md` («La cámara»). Las marcas vienen en fracciones del cuadro; aquí se pasan
 * a píxeles contando el recorte.
 *
 * En `frozen` el resultado se dibuja sobre el cuadro que se mandó, no sobre el video de ahora.
 */
@Component({
  selector: 'app-board-stage',
  templateUrl: './board-stage.html',
  styleUrl: './board-stage.scss',
})
export class BoardStage {
  readonly mode = input.required<'live' | 'frozen'>();
  /** El cuadro que se muestra en `frozen`. */
  readonly frame = input<SentFrame | null>(null);
  readonly marks = input<readonly Mark[]>([]);
  /** Lo que ve el lector de pantalla del escenario. */
  readonly description = input('');

  /** El `<video>` en `live`: `CheckService` le pone la cámara. */
  readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');

  private readonly stageSize = signal<Size | null>(null);
  private readonly videoSize = signal<Size | null>(null);
  protected readonly imageUrl = signal<string | null>(null);

  /** El tamaño del cuadro: el del video en vivo o el del cuadro mandado. */
  private readonly frameSize = computed<Size | null>(() => {
    if (this.mode() === 'frozen') {
      const frame = this.frame();
      return frame ? { width: frame.width, height: frame.height } : null;
    }
    return this.videoSize();
  });

  private readonly layout = computed(() => {
    const frame = this.frameSize();
    const stage = this.stageSize();
    return frame && stage ? coverLayout(frame, stage) : null;
  });

  protected readonly drawn = computed<Drawn[]>(() => {
    const layout = this.layout();
    const stage = this.stageSize();
    if (!layout || !stage) return [];
    const items: Drawn[] = [];
    this.marks().forEach((mark, index) => {
      if (mark.kind === 'name' || mark.kind === 'piece') {
        const rect = boxToRect(mark.box, layout);
        if (!isVisible(rect, stage)) return;
        items.push({
          key: `${mark.kind}-${index}`,
          kind: mark.kind,
          rect,
          text: mark.label,
          below: rect.top < 30,
        });
      } else if (mark.kind === 'missing-marker') {
        const at = pointToPixels(mark, layout);
        const size = 34;
        const rect = { left: at.x - size / 2, top: at.y - size / 2, width: size, height: size };
        if (isVisible(rect, stage)) {
          items.push({ key: `missing-${index}`, kind: mark.kind, rect, text: null, below: false });
        }
      }
    });
    return items;
  });

  /** Las flechas de las piezas por mover, con su punta y su «VA AQUÍ». */
  protected readonly arrows = computed<Arrow[]>(() => {
    const layout = this.layout();
    const stage = this.stageSize();
    if (!layout || !stage) return [];
    const arrows: Arrow[] = [];
    for (const mark of this.marks()) {
      if (mark.kind !== 'arrow') continue;
      const rect = boxToRect(mark.box, layout);
      const from = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const { x, y } = mark.direction;
      // Que la flecha no se salga del escenario
      const to = {
        x: Math.min(stage.width - 8, Math.max(8, from.x + x * ARROW_LENGTH)),
        y: Math.min(stage.height - 8, Math.max(8, from.y + y * ARROW_LENGTH)),
      };
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const wing = (turn: number) =>
        `${to.x - Math.cos(angle + turn) * 10},${to.y - Math.sin(angle + turn) * 10}`;
      arrows.push({
        from,
        to,
        head: `${wing(0.45)} ${to.x},${to.y} ${wing(-0.45)}`,
        labelAt: { x: to.x, y: to.y },
      });
    }
    return arrows;
  });

  constructor() {
    // El cuadro mandado se muestra desde su Blob; la dirección se libera al cambiar de cuadro
    effect((onCleanup) => {
      const frame = this.frame();
      if (!frame) {
        this.imageUrl.set(null);
        return;
      }
      const url = URL.createObjectURL(frame.blob);
      this.imageUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const element = this.box().nativeElement;
      const measure = () =>
        this.stageSize.set({ width: element.clientWidth, height: element.clientHeight });
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** El video ya sabe de qué tamaño es: desde aquí se pueden dibujar las marcas. */
  protected onVideoMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.videoSize.set({ width: video.videoWidth, height: video.videoHeight });
  }
}

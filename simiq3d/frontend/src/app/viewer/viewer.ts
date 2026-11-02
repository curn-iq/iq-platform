import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  computed,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FreeArea, MayoScene, SceneView } from './mayo-scene';
import type { PlacedItem } from '../domain/placement';
import { supportsWebGL } from './webgl';

/** En qué está el visor. */
export type ViewerState = 'loading' | 'ready' | 'unsupported' | 'failed';

/**
 * El visor 3D de la mesa de Mayo. Three.js se descarga aparte, recién al
 * abrirlo (`import()`): el resto de la página no lo espera. Sin WebGL lo dice y
 * ofrece la mesa en DataIQ.
 */
@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.html',
  styleUrl: './viewer.scss',
})
export class Viewer {
  /** Los objetos de la mesa; `undefined` mientras llegan. */
  readonly items = input.required<readonly PlacedItem[] | undefined>();
  /** El objeto señalado (su `itemId`): lo cambia quien usa el visor y tocar una pieza. */
  readonly selected = model<string | null>(null);
  /** Lo que tapan los paneles de la pantalla, para encuadrar la mesa en el resto. */
  readonly freeArea = input<FreeArea>({ top: 0, right: 0, bottom: 0, left: 0 });
  /** Para el aviso sin 3D: la técnica y su mesa en DataIQ. */
  readonly techniqueName = input('');
  readonly dataiqUrl = input.required<string>();
  /** Desde dónde se mira la mesa. */
  readonly view = input<SceneView>('3d');
  /** Se tocó una pieza en la escena (su `itemId`), o la mesa vacía. */
  readonly tapped = output<string | null>();
  /** Se empezó a girar o acercar la mesa. */
  readonly interacted = output<void>();

  protected readonly state = signal<ViewerState>('loading');
  /** Dónde va la insignia con el número de la pieza señalada. */
  protected readonly badge = signal<{ x: number; y: number } | null>(null);
  protected readonly badgeNumber = computed(
    () => this.items()?.find((item) => item.itemId === this.selected())?.legendNumber ?? null,
  );
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly scene = signal<MayoScene | undefined>(undefined);

  constructor() {
    // Sin `matchMedia` (jsdom en las pruebas) no hay preferencia
    const reducedMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    afterNextRender(async () => {
      if (!supportsWebGL()) {
        this.state.set('unsupported');
        return;
      }
      try {
        const { MayoScene } = await import('./mayo-scene');
        this.scene.set(
          new MayoScene(this.canvas().nativeElement, {
            reducedMotion,
            onPick: (itemId) => {
              this.selected.set(itemId);
              this.tapped.emit(itemId);
            },
            onRender: (badge) => this.badge.set(badge),
            onInteract: () => this.interacted.emit(),
          }),
        );
      } catch {
        this.state.set('failed');
      }
    });

    effect(() => {
      const scene = this.scene();
      const items = this.items();
      if (!scene) return;
      if (items === undefined) {
        this.state.set('loading');
        return;
      }
      untracked(() => this.show(scene, items));
    });
    effect(() => this.scene()?.highlight(this.selected(), true));
    effect(() => this.scene()?.setFreeArea(this.freeArea()));
    effect(() => this.scene()?.setView(this.view()));
    inject(DestroyRef).onDestroy(() => this.scene()?.dispose());
  }

  /** Acerca (`1`) o aleja (`-1`) la cámara. */
  zoom(direction: 1 | -1): void {
    this.scene()?.zoom(direction);
  }

  /** Vuelve a encuadrar la mesa entera. */
  center(): void {
    this.scene()?.frame(true);
  }

  private async show(scene: MayoScene, items: readonly PlacedItem[]): Promise<void> {
    this.state.set('loading');
    try {
      await scene.setTable(items);
      scene.highlight(this.selected(), false);
      this.state.set('ready');
    } catch {
      this.state.set('failed');
    }
  }
}

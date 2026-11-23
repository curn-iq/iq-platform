import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Layout } from '../core/layout/layout';
import { estimateMissingMarker } from '../domain/markers';
import { BoardStage } from './board-stage/board-stage';
import type { Mark } from './board-stage/marks';
import { CheckService } from './check.service';
import { FramingPanel } from './framing-panel/framing-panel';

/**
 * La cámara: el estudiante apunta a la mesa, la arma y SIVRI la compara. Sin la barra del
 * shell: lleva su propia barra de estado («Salir» y «EN VIVO») y el video aprovecha el alto
 * (`DESIGN.md`, «SIVRI: celular y computador (mockups)»). Pide cuenta.
 *
 * Opcional: `?tecnica=<id de DataIQ>` valida esa técnica en vez de reconocer de cuál de las
 * cinco es la mesa; si SIVRI no la valida, se dice «técnica fuera del alcance».
 */
@Component({
  selector: 'app-check-page',
  imports: [BoardStage, FramingPanel, RouterLink],
  providers: [CheckService],
  templateUrl: './check-page.html',
  styleUrl: './check-page.scss',
})
export class CheckPage {
  /** La técnica por validar (`?tecnica=`); sin ella, SIVRI la reconoce. */
  readonly tecnica = input<string>();

  protected readonly check = inject(CheckService);
  private readonly layout = inject(Layout);
  private readonly stage = viewChild(BoardStage);

  protected readonly flow = this.check.flow;
  protected readonly framing = computed(
    () => this.flow().screen === 'framing' || this.flow().screen === 'assembling',
  );

  /** Lo que se dibuja sobre el video: el marcador que falta y, mientras arma, lo que se ve. */
  protected readonly marks = computed<Mark[]>(() => {
    const live = this.check.live();
    const flow = this.flow();
    if (!live || !this.framing()) return [];
    const marks: Mark[] = [];
    const missing = estimateMissingMarker(live.reading.markers);
    if (missing) marks.push({ kind: 'missing-marker', x: missing.x, y: missing.y });
    if (flow.screen === 'assembling') {
      for (const detection of live.reading.detections) {
        marks.push({ kind: 'name', label: detection.label, box: detection.box });
      }
    }
    return marks;
  });

  /**
   * Lo que se le anuncia al lector de pantalla. Cambia solo cuando cambia lo que se dice, así que
   * no se repite con cada cuadro (`aria-live` cortés).
   */
  protected readonly announcement = computed(() => {
    const flow = this.flow();
    if (flow.committed) return 'Revisando la mesa. Mantén el celular quieto un momento.';
    if (flow.screen === 'assembling') {
      return 'Se ven los cuatro marcadores. Cuando termines de armar la mesa, pulsa «Ya armé la mesa».';
    }
    if (flow.screen === 'framing' && flow.markers.phrase) {
      return `${flow.markers.phrase} ${flow.markers.hint}`;
    }
    return '';
  });

  constructor() {
    // El `<video>` cambia cuando la pantalla pasa del video en vivo al cuadro fijo y vuelve
    effect(() => {
      const video = this.stage()?.video()?.nativeElement ?? null;
      untracked(() => this.check.setVideo(video));
    });
    // Con un error, vuelve la barra del shell: el error es una página de texto
    effect(() => this.layout.immersive.set(!this.flow().error));
    afterNextRender(() => this.check.start(this.tecnica()));
    inject(DestroyRef).onDestroy(() => this.layout.immersive.set(false));
  }
}

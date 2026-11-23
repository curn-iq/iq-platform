import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Layout } from '../core/layout/layout';
import { ShellNavigation } from '../core/session/shell';
import { moveDirection } from '../domain/geometry';
import { corrections, headline, summaryOf, type Piece } from '../domain/frame-reading';
import { estimateMissingMarker } from '../domain/markers';
import { BoardStage } from './board-stage/board-stage';
import type { Mark } from './board-stage/marks';
import { CheckService } from './check.service';
import { ErrorPage } from './error-page/error-page';
import { FramingPanel } from './framing-panel/framing-panel';
import { PiecePanel } from './piece-panel/piece-panel';
import { ResultPanel } from './result-panel/result-panel';

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
  imports: [BoardStage, ErrorPage, FramingPanel, PiecePanel, ResultPanel, RouterLink],
  providers: [CheckService],
  templateUrl: './check-page.html',
  styleUrl: './check-page.scss',
})
export class CheckPage {
  /** La técnica por validar (`?tecnica=`); sin ella, SIVRI la reconoce. */
  readonly tecnica = input<string>();

  protected readonly check = inject(CheckService);
  private readonly layout = inject(Layout);
  private readonly shell = inject(ShellNavigation);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stage = viewChild(BoardStage);

  protected readonly flow = this.check.flow;
  protected readonly framing = computed(
    () => this.flow().screen === 'framing' || this.flow().screen === 'assembling',
  );
  /** Con el resultado fijado, el escenario es el cuadro que se mandó y no el video. */
  protected readonly frozen = computed(
    () => this.flow().screen === 'result' || this.flow().screen === 'piece',
  );

  /** Lo que hay que corregir de la técnica fijada, en el orden en que se recorre. */
  protected readonly pending = computed<readonly Piece[]>(() => {
    const top = this.flow().result?.techniques[0];
    return top ? corrections(top) : [];
  });
  protected readonly currentPiece = computed(() => this.pending()[this.flow().pieceIndex] ?? null);
  protected readonly nextPiece = computed(() => this.pending()[this.flow().pieceIndex + 1] ?? null);

  /** Lo que se dibuja sobre el escenario según la pantalla. */
  protected readonly marks = computed<Mark[]>(() => {
    const flow = this.flow();
    if (flow.screen === 'result') return this.resultMarks();
    if (flow.screen === 'piece') return this.pieceMarks();
    return this.liveMarks();
  });

  /** Sobre el video: el marcador que falta y, mientras arma, lo que se ve. */
  private liveMarks(): Mark[] {
    const live = this.check.live();
    if (!live || !this.framing()) return [];
    const marks: Mark[] = [];
    const missing = estimateMissingMarker(live.reading.markers);
    if (missing) marks.push({ kind: 'missing-marker', x: missing.x, y: missing.y });
    if (this.flow().screen === 'assembling') {
      for (const detection of live.reading.detections) {
        marks.push({ kind: 'name', label: detection.label, box: detection.box });
      }
    }
    return marks;
  }

  /** En el resultado: solo lo que hay que corregir lleva marca; lo que está en su lugar, no. */
  private resultMarks(): Mark[] {
    const top = this.flow().result?.techniques[0];
    if (!top) return [];
    const marks: Mark[] = [];
    for (const piece of top.move) {
      if (piece.box) marks.push({ kind: 'piece', label: tag('Mover', piece), box: piece.box });
    }
    for (const piece of top.extra) {
      if (piece.box) marks.push({ kind: 'piece', label: tag('Sobra', piece), box: piece.box });
    }
    return marks;
  }

  /** En una pieza: su caja y, si hay que moverla, la flecha hacia donde va. */
  private pieceMarks(): Mark[] {
    const piece = this.currentPiece();
    const result = this.flow().result;
    if (!piece?.box || !result) return [];
    const marks: Mark[] = [
      { kind: 'piece', label: `${piece.label}${number(piece)}`, box: piece.box },
    ];
    const direction = moveDirection(piece.move, result.markers);
    if (piece.kind === 'move' && direction)
      marks.push({ kind: 'arrow', box: piece.box, direction });
    return marks;
  }

  /**
   * Lo que se le anuncia al lector de pantalla. Cambia solo cuando cambia lo que se dice, así que
   * no se repite con cada cuadro (`aria-live` cortés). Las pantallas de resultado y de pieza
   * mueven el foco a su titular, que es lo que se lee.
   */
  protected readonly announcement = computed(() => {
    const flow = this.flow();
    if (flow.screen === 'result' && flow.result) {
      const top = flow.result.techniques[0];
      return flow.result.techniques.length > 1
        ? 'Puede ser una de dos técnicas.'
        : `${top.name}. ${headline(top)} ${summaryOf(top)}`;
    }
    if (flow.committed) return 'Revisando la mesa. Mantén el celular quieto un momento.';
    if (flow.screen === 'assembling') {
      return 'Se ven los cuatro marcadores. Cuando termines de armar la mesa, pulsa «Ya armé la mesa».';
    }
    if (flow.screen === 'framing' && flow.markers.phrase) {
      return `${flow.markers.phrase} ${flow.markers.hint}`;
    }
    return '';
  });

  /** «Ingresar»: al ingreso del shell, para volver a la cámara. */
  protected signIn(): void {
    this.shell.goToLogin('/camara');
  }

  constructor() {
    // El `<video>` cambia cuando la pantalla pasa del video en vivo al cuadro fijo y vuelve
    effect(() => {
      const video = this.stage()?.video()?.nativeElement ?? null;
      untracked(() => this.check.setVideo(video));
    });
    // Con un error, vuelve la barra del shell: el error es una página de texto
    effect(() => this.layout.immersive.set(!this.flow().error));
    // Al pasar al resultado o a una pieza, el foco va al titular: lo lee el lector de pantalla y
    // el teclado sigue desde ahí
    effect(() => {
      const screen = this.flow().screen;
      const piece = this.flow().pieceIndex;
      if (screen !== 'result' && screen !== 'piece') return;
      void piece;
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('h1[tabindex]')?.focus());
    });
    afterNextRender(() => this.check.start(this.tecnica()));
    inject(DestroyRef).onDestroy(() => this.layout.immersive.set(false));
  }
}

/** «Mover · n.º 6» */
function tag(verb: string, piece: Piece): string {
  return `${verb}${number(piece)}`;
}

function number(piece: Piece): string {
  return piece.legendNumber === null ? '' : ` · n.º ${piece.legendNumber}`;
}

import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { ChatField } from '../chat/chat-field';
import { ChatHistory, ChatNames } from '../chat/chat-history';
import { SessionService } from '../core/session/session.service';
import { DataIQRepository } from '../data/dataiq.repository';
import { toMayoTable } from '../data/mayo-table';
import { Simiq3dRepository } from '../data/simiq3d.repository';
import { placeItems } from '../domain/placement';
import { suggestions } from '../domain/suggestions';
import { initials } from '../shared/initials';
import { mediaQuery, MOBILE_QUERY } from '../shared/media-query';
import type { FreeArea, SceneView } from '../viewer/mayo-scene';
import { Viewer } from '../viewer/viewer';
import { CanvasHead } from './canvas-head/canvas-head';
import { ConversationService } from './conversation.service';
import { InstrumentCard } from './instrument-card/instrument-card';
import { Legend } from './legend/legend';
import { TechniqueSheet } from './technique-sheet/technique-sheet';
import { ViewControls } from './view-controls/view-controls';

/** Las técnicas que SIMIQ3D muestra en 3D: las de Cirugía General, como el chat. */
export const SCOPE_SPECIALTY = 'Cirugía General';

/** Ancho del chat: entre 300 y 560 px; con las flechas, de 24 en 24. */
const CHAT_WIDTH = { initial: 380, min: 300, max: 560, step: 24 };

/** Qué muestra el lienzo. */
type CanvasState = 'empty' | 'uncovered' | 'missing' | 'table';

/**
 * La pantalla de exploración, `/simiq3d` y `/simiq3d/tecnicas/:id`: un banco de
 * trabajo con el chat como panel lateral y la mesa de Mayo en 3D como lienzo
 * («SIMIQ3D: explorar en 3D» en `DESIGN.md`).
 */
@Component({
  selector: 'app-explore-page',
  imports: [
    CanvasHead,
    ChatField,
    ChatHistory,
    InstrumentCard,
    Legend,
    TechniqueSheet,
    Viewer,
    ViewControls,
  ],
  templateUrl: './explore-page.html',
  styleUrl: './explore-page.scss',
})
export class ExplorePage {
  /** La técnica de la ruta (`:id`); sin ella, la bienvenida. */
  readonly id = input<string>();

  private readonly dataiq = inject(DataIQRepository);
  private readonly simiq3d = inject(Simiq3dRepository);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  protected readonly conversation = inject(ConversationService);
  protected readonly mobile = mediaQuery(MOBILE_QUERY);

  protected readonly techniques = this.dataiq.techniques();
  private readonly tables = this.dataiq.tables(() => this.id());
  private readonly models = this.simiq3d.models();
  private readonly instruments = this.dataiq.instruments();

  /** Las técnicas que se pueden ver en 3D, para el selector y la bienvenida. */
  protected readonly covered = computed(() =>
    (this.techniques.value() ?? []).filter((t) => t.specialty === SCOPE_SPECIALTY),
  );
  protected readonly technique = computed(() =>
    this.techniques.value()?.find((t) => t.id === this.id()),
  );
  protected readonly state = computed<CanvasState>(() => {
    if (!this.id()) return 'empty';
    const technique = this.technique();
    if (technique === undefined) return this.techniques.hasValue() ? 'missing' : 'table';
    return technique.specialty === SCOPE_SPECIALTY ? 'table' : 'uncovered';
  });

  /** La mesa de Mayo; `null` si la técnica no la lleva o DataIQ no trae su tamaño. */
  protected readonly mayo = computed(() => {
    const tables = this.tables.value();
    return this.state() !== 'table' || tables === undefined ? undefined : toMayoTable(tables);
  });
  /** Lo que dibuja el visor: sin técnica, la mesa vacía; `undefined` mientras llega. */
  protected readonly placed = computed(() => {
    if (this.state() !== 'table') return [];
    const mayo = this.mayo();
    const models = this.models.value();
    if (mayo === undefined || models === undefined) return undefined;
    if (mayo === null) return [];
    const byInstrument = new Map(models.map((m) => [m.instrument_id, m.model_file]));
    return placeItems(mayo, (instrumentId) => byInstrument.get(instrumentId));
  });

  /** El objeto señalado; al cambiar de técnica, ninguno. */
  protected readonly selected = linkedSignal<string | undefined, string | null>({
    source: () => this.id(),
    computation: () => null,
  });
  /** La ficha se abre al tocar una pieza (o al pedirla en el chat). */
  protected readonly cardOpen = linkedSignal<string | undefined, boolean>({
    source: () => this.id(),
    computation: () => false,
  });
  protected readonly selectedItem = computed(() =>
    this.mayo()?.items.find((item) => item.id === this.selected()),
  );
  protected readonly cardInstruments = computed(() => {
    const all = this.instruments.value() ?? [];
    return (this.selectedItem()?.instrumentIds ?? []).flatMap((id) => {
      const instrument = all.find((i) => i.id === id);
      return instrument ? [instrument] : [];
    });
  });

  /** En escritorio la leyenda abre abierta; en celular, plegada. */
  protected readonly legendOpen = linkedSignal(() => !this.mobile());
  protected readonly view = signal<SceneView>('3d');
  /** La pista de cómo girar se apaga al primer gesto. */
  protected readonly hint = signal(true);
  protected readonly sheetOpen = signal(false);
  protected readonly historyOpen = signal(false);
  protected readonly chatWidth = signal(CHAT_WIDTH.initial);
  /** Alto del campo de pregunta, que en celular tapa la parte de abajo del lienzo. */
  protected readonly fieldHeight = signal(150);

  /** La bienvenida: sin técnica abierta y sin haber preguntado nada. */
  protected readonly welcome = computed(
    () => this.state() === 'empty' && this.conversation.messages().length === 0,
  );
  /** Tres preguntas para empezar, con nombres de DataIQ (`domain/suggestions.ts`). */
  protected readonly suggestions = computed(() => {
    const technique = this.technique();
    const mayo = this.mayo();
    return suggestions(
      this.covered().map((t) => t.name),
      technique && mayo ? { name: technique.name, items: mayo.items } : undefined,
    );
  });
  /** Los nombres de DataIQ para el chip de cada respuesta. */
  protected readonly names = computed<ChatNames>(() => ({
    techniques: new Map((this.techniques.value() ?? []).map((t) => [t.id, t.name])),
    instruments: new Map((this.instruments.value() ?? []).map((i) => [i.id, i.name])),
  }));
  protected readonly initials = computed(() => initials(this.session.account()?.name ?? ''));
  /** En celular, la última respuesta va encima del campo. */
  protected readonly lastReply = computed(() => {
    const last = [...this.conversation.messages()]
      .reverse()
      .find((message) => message.from === 'simiq3d');
    return last?.from === 'simiq3d'
      ? { text: last.reply.reply, options: last.reply.options }
      : null;
  });

  protected readonly title = computed(() => this.technique()?.name ?? 'Explorar en 3D');
  protected readonly meta = computed(() =>
    this.state() === 'table' && this.technique()
      ? `Mesa de Mayo · ${this.technique()!.specialty}`
      : null,
  );
  /** Dónde está la mesa abierta en DataIQ (la técnica, sin ella). */
  protected readonly dataiqUrl = computed(() => {
    const id = this.id();
    return id
      ? `${environment.shellUrl}/tecnicas/${encodeURIComponent(id)}/mesa-de-mayo`
      : `${environment.shellUrl}/tecnicas`;
  });
  /** Lo que tapan las piezas flotantes del lienzo: la mesa se encuadra en el resto. */
  protected readonly freeArea = computed<FreeArea>(() =>
    this.mobile()
      ? { top: 84, right: 0, bottom: this.fieldHeight() + 56, left: 0 }
      : { top: 150, right: this.legendOpen() && this.mayo() ? 324 : 0, bottom: 70, left: 0 },
  );

  private readonly field = viewChild.required(ChatField, { read: ElementRef });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // Sin `ResizeObserver` (jsdom en las pruebas) se queda el alto de partida
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.fieldHeight.set(Math.round(entry.borderBoxSize[0]?.blockSize ?? 150)),
      );
      observer.observe(this.field().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    // Lo que pide la respuesta del chat: abrir su técnica y, cuando llega su mesa,
    // señalar el instrumento (y abrir su ficha, si se pidió). Nunca sale del texto.
    effect(() => {
      const change = this.conversation.scene();
      if (!change) return;
      const id = this.id();
      if (change.technique && change.technique !== id) {
        untracked(() => this.open(change.technique!));
        return;
      }
      if (change.instrument === null) {
        untracked(() => this.conversation.takeScene());
        return;
      }
      const mayo = this.mayo();
      if (mayo === undefined) return;
      untracked(() => {
        const item = mayo?.items.find((i) => i.instrumentIds.includes(change.instrument!));
        if (item) {
          this.selected.set(item.id);
          this.cardOpen.set(change.card);
        }
        this.conversation.takeScene();
      });
    });
  }

  /** Una pregunta al chat, con la técnica abierta. */
  protected ask(question: string): void {
    void this.conversation.ask(question, this.id() ?? null);
  }

  protected open(id: string): void {
    void this.router.navigate(['/tecnicas', id]);
  }

  /** En celular la leyenda tapa la mesa: al elegir una pieza se pliega para que se vea. */
  protected pickFromLegend(id: string): void {
    this.selected.set(id);
    if (this.mobile()) this.legendOpen.set(false);
  }

  /** Tocar una pieza la señala y abre su ficha; tocar la mesa vacía la suelta. */
  protected onTap(itemId: string | null): void {
    this.cardOpen.set(itemId !== null);
  }

  /** Arrastrar el divisor cambia el ancho del chat. */
  protected startResize(event: PointerEvent): void {
    const divider = event.currentTarget as HTMLElement;
    const startX = event.clientX;
    const startWidth = this.chatWidth();
    divider.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => this.setChatWidth(startWidth + e.clientX - startX);
    const end = () => {
      divider.removeEventListener('pointermove', move);
      divider.removeEventListener('pointerup', end);
      divider.removeEventListener('pointercancel', end);
    };
    divider.addEventListener('pointermove', move);
    divider.addEventListener('pointerup', end);
    divider.addEventListener('pointercancel', end);
  }

  protected resizeWithKeys(event: KeyboardEvent): void {
    const step = { ArrowLeft: -CHAT_WIDTH.step, ArrowRight: CHAT_WIDTH.step }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    this.setChatWidth(this.chatWidth() + step);
  }

  private setChatWidth(width: number): void {
    this.chatWidth.set(Math.min(CHAT_WIDTH.max, Math.max(CHAT_WIDTH.min, width)));
  }
}

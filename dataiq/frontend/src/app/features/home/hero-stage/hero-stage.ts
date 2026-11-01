import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
  viewChildren,
  type ElementRef,
} from '@angular/core';
import { REDUCED_MOTION_QUERY, mediaQuery } from '../../../shared/media-query';
import { DEMO_TABLE, MISPLACED_NUMBER } from '../demo-table';
import { HomeTable, type TableView } from '../home-table/home-table';
import { StageRail } from '../stage-rail/stage-rail';

/** Cada cuánto cambia sola la vista, y cuánto tarda el barrido de la cámara en dejar las cajas. */
export const CYCLE_MS = 5500;
export const SCAN_MS = 650;

/** El número de la pieza que la portada tiene elegida al cargar. */
const FIRST_SELECTED = 7;

interface Tab {
  view: TableView;
  title: string;
  tool: string;
}

const TABS: readonly Tab[] = [
  { view: 'reference', title: 'Referencia', tool: 'DataIQ' },
  { view: '3d', title: '3D', tool: 'SIMIQ3D' },
  { view: 'camera', title: 'Cámara', tool: 'SIVRI' },
];

/**
 * El escenario de la portada, según «Escenario de la mesa» de `DESIGN.md`: la
 * misma mesa de ejemplo en tres vistas (referencia, 3D y cámara). El selector
 * cambia solo cada 5,5 s con un trazo de progreso bajo la pestaña activa; se
 * pausa al pasar el puntero y se detiene al interactuar. Con movimiento
 * reducido no corre. Tocar una pieza la marca y el riel la muestra de cerca;
 * «Ver las 10 piezas» abre la leyenda sobre la mesa. Lo que muestran 3D y
 * cámara es demostración y se dice.
 */
@Component({
  selector: 'app-hero-stage',
  imports: [HomeTable, StageRail],
  templateUrl: './hero-stage.html',
  styleUrl: './hero-stage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-view]': 'view()', '[style.--cycle.ms]': 'cycleMs' },
})
export class HeroStage {
  protected readonly table = DEMO_TABLE;
  protected readonly tabs = TABS;
  protected readonly cycleMs = CYCLE_MS;

  readonly view = signal<TableView>('reference');
  protected readonly selected = signal<number | null>(FIRST_SELECTED);
  protected readonly listOpen = signal(false);
  /** El selector cambia solo mientras nadie interactúe. */
  protected readonly autoplay = signal(false);
  protected readonly paused = signal(false);
  /** Cambia cada vez que el trazo de progreso debe volver a empezar. */
  protected readonly epoch = signal(0);
  /** La cámara está barriendo la mesa, y luego ya trazó las cajas. */
  protected readonly scanning = signal(false);
  protected readonly scanned = signal(false);

  protected readonly selectedItem = computed(
    () => this.table.items.find((item) => item.legendNumber === this.selected()) ?? null,
  );
  protected readonly misplacedItem = computed(
    () => this.table.items.find((item) => item.legendNumber === MISPLACED_NUMBER) ?? null,
  );

  private readonly reduced = mediaQuery(REDUCED_MOTION_QUERY);
  private cycleTimer: ReturnType<typeof setInterval> | null = null;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tab');
  private readonly rail = viewChild.required(StageRail);

  constructor() {
    afterNextRender(() => {
      if (this.reduced()) return;
      this.autoplay.set(true);
      this.startCycle();
    });
    inject(DestroyRef).onDestroy(() => {
      this.stopCycle();
      this.clearScan();
    });
  }

  // ---------- Vistas ----------

  /** Muestra una vista: la lista se cierra, y la cámara barre la mesa y traza las cajas. */
  private show(view: TableView): void {
    this.view.set(view);
    if (view !== 'reference') this.listOpen.set(false);
    this.clearScan();
    this.scanning.set(false);
    this.scanned.set(false);
    if (view !== 'camera') return;
    this.scanning.set(true);
    this.scanTimer = setTimeout(
      () => {
        this.scanTimer = null;
        if (this.view() === 'camera') this.scanned.set(true);
      },
      this.reduced() ? 0 : SCAN_MS,
    );
  }

  private clearScan(): void {
    if (this.scanTimer !== null) clearTimeout(this.scanTimer);
    this.scanTimer = null;
  }

  protected next(): void {
    const index = TABS.findIndex((tab) => tab.view === this.view());
    this.show(TABS[(index + 1) % TABS.length].view);
    this.epoch.update((value) => value + 1);
  }

  /** La persona eligió una vista: deja de cambiar sola. */
  protected choose(view: TableView): void {
    this.stopAutoplay();
    if (view !== this.view()) this.show(view);
  }

  protected onTabKeydown(event: KeyboardEvent, index: number): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const target = (index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    this.choose(TABS[target].view);
    this.tabButtons()[target]?.nativeElement.focus();
  }

  // ---------- Cambio automático ----------

  private startCycle(): void {
    this.stopCycle();
    this.cycleTimer = setInterval(() => this.next(), CYCLE_MS);
  }

  private stopCycle(): void {
    if (this.cycleTimer !== null) clearInterval(this.cycleTimer);
    this.cycleTimer = null;
  }

  protected stopAutoplay(): void {
    this.autoplay.set(false);
    this.stopCycle();
  }

  /** El puntero entra al escenario: el cambio y su trazo se pausan. */
  protected pause(): void {
    if (!this.autoplay()) return;
    this.paused.set(true);
    this.stopCycle();
  }

  /** El puntero sale: el trazo vuelve a empezar y el cambio sigue. */
  protected resume(): void {
    if (!this.autoplay()) return;
    this.paused.set(false);
    this.epoch.update((value) => value + 1);
    this.startCycle();
  }

  // ---------- Piezas y lista ----------

  protected toggleList(): void {
    this.stopAutoplay();
    this.listOpen.update((open) => !open);
  }

  protected closeList(): void {
    this.listOpen.set(false);
    this.rail().focusShowAll();
  }

  protected chooseFromList(number: number): void {
    this.selected.set(number);
    this.stopAutoplay();
    this.listOpen.set(false);
  }
}

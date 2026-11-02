import {
  CdkDrag,
  CdkDragPreview,
  CdkDropList,
  type CdkDragEnd,
  type CdkDragMove,
} from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import type { CatalogInstrument } from '../../../../domain/instrumental-picker';
import { ZONE_NAMES } from '../../../../domain/table';
import {
  addObjectToZone,
  clearCell,
  clampSize,
  editorTable,
  instrumentIdsInZone,
  markNotCarried,
  MAX_SIZE,
  MIN_SIZE,
  mostUsedInZone,
  occupantAt,
  placeObject,
  placeText,
  resizeZone,
  tableHint,
  DEFAULT_COLUMNS,
  DEFAULT_ROWS,
  ensureZone,
  itemsOfZone,
  type TableData,
  type ZoneRef,
} from '../../../../domain/table-editor';
import { TableDiagram } from '../../../../shared/table-diagram/table-diagram';
import { Button } from '../../../../shared/ui/button/button';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { EditorCatalog } from '../editor-catalog';
import { EDITOR_LAYOUT } from '../editor-layout';
import { EditorState } from '../editor-state';
import { ObjectPicker } from './object-picker/object-picker';

/** Qué mesa arma el paso: la de Mayo o la de reserva. */
export type TableKind = keyof typeof ZONE_NAMES;

/** Lo que se deja libre contra el menú de arriba y la barra de abajo al mostrar «Qué va aquí», en píxeles. */
const VIEW_MARGIN = 8;
/** Hasta este ancho de ventana el menú de arriba es el del celular. */
const MOBILE_WIDTH = 760;

/** Cuántos «más usados» se ofrecen como atajo en la mesa de reserva. */
const QUICK_COUNT = 7;

/** Una celda con lo que dice de ella. */
interface Cell {
  row: number;
  column: number;
  /** La posición del objeto que la ocupa en la lista de objetos, o `-1` si está vacía. */
  occupant: number;
  /** Su número y nombre, para el objeto que se arrastra desde ella. */
  object: { number: number | null; name: string } | null;
  label: string;
}

/** Cómo se nombra un objeto en las celdas y en la ayuda: con su número si lo tiene («3, Pinza Kelly»). */
function objectLabel(object: { number: number | null; name: string }): string {
  return object.number === null ? object.name : `${object.number}, ${object.name}`;
}

/** El selector «Qué va aquí» abierto sobre una celda, con dónde dibujarlo. */
interface Choice {
  row: number;
  column: number;
  left: number;
  top: number;
}

/**
 * Los pasos «Mesa de Mayo» y «Mesa de reserva» del editor, según «Editor de técnica (página)» de `DESIGN.md`
 * y Resuelto 54 de `dataiq/docs/checklist-frontend.md`. A la izquierda, los objetos de la mesa con su
 * número (el de la leyenda; cada mesa tiene el suyo) y su lugar; a la derecha, la mesa con su tamaño. Un
 * objeto se ubica **arrastrándolo** a una celda (CDK; con el dedo, tras una pulsación larga para no
 * quitarle el desplazamiento a la página) o **tocando**: elegir un objeto y luego su celda, o tocar una
 * celda y elegir en «Qué va aquí» el objeto (o vaciarla). Poner un objeto donde hay otro los intercambia.
 * «Agregar objeto» abre el catálogo y crea el objeto en la mesa y, con él, en el instrumental de la técnica.
 *
 * Las filas y columnas viven en `zones` (de 2 a 10, 4 × 6 al empezar); lo que queda fuera al achicar vuelve
 * a «sin ubicar». La mesa de reserva puede no llevarse (`used: false`). La mesa se crea al hacer el primer
 * cambio. Las reglas están en `domain/table-editor.ts`; todo pasa por `EditorState.edit()`, que lo guarda.
 * Con la versión en solo lectura se ve todo y nada se cambia.
 */
@Component({
  selector: 'app-table-step',
  imports: [
    Button,
    CdkDrag,
    CdkDragPreview,
    CdkDropList,
    CheckboxField,
    ObjectPicker,
    TableDiagram,
  ],
  templateUrl: './table-step.html',
  styleUrl: './table-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeChoice()',
    '(keydown.escape)': 'escape()',
  },
})
export class TableStep {
  readonly kind = input.required<TableKind>();

  private readonly state = inject(EditorState);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly layout = inject(EDITOR_LAYOUT, { optional: true });
  private readonly catalogResource = inject(EditorCatalog).use();

  protected readonly readonly = computed(() => !this.state.editable());
  protected readonly isReserve = computed(() => this.kind() === 'reserve');
  protected readonly zoneName = computed(() => ZONE_NAMES[this.kind()]);
  protected readonly minSize = MIN_SIZE;
  protected readonly maxSize = MAX_SIZE;

  // ---------- El catálogo ----------

  private readonly catalog = computed(() =>
    this.catalogResource.hasValue() ? this.catalogResource.value() : undefined,
  );
  protected readonly loaded = computed(() => this.catalog() !== undefined);
  /** El catálogo no llegó por un error (el interceptor ya avisó): no se sabe qué mesas hay. */
  protected readonly failed = computed(
    () =>
      !this.loaded() &&
      !this.catalogResource.isLoading() &&
      this.catalogResource.error() !== undefined,
  );
  private readonly instruments = computed<readonly CatalogInstrument[]>(
    () => this.catalog()?.instruments ?? [],
  );
  protected readonly categoryOrder = computed(() =>
    (this.catalog()?.categories ?? []).map((category) => category.name),
  );
  /** La mesa de esta pantalla en el catálogo: su id es el que `zones` e `items` necesitan. */
  private readonly ref = computed<ZoneRef | undefined>(() => {
    const zone = this.catalog()?.zones.find((candidate) => candidate.name === this.zoneName());
    return zone ? { id: zone.id, name: zone.name } : undefined;
  });

  protected retry(): void {
    this.catalogResource.reload();
  }

  // ---------- La mesa ----------

  private readonly content = computed(() => this.state.content());
  private readonly data = computed<TableData>(() => ({
    zones: this.content()?.zones ?? [],
    items: this.content()?.items ?? [],
  }));
  private readonly zone = computed(() => {
    const ref = this.ref();
    return ref ? this.data().zones.find((candidate) => candidate.zone_id === ref.id) : undefined;
  });
  /** La mesa que se dibuja: la de la versión o, mientras no se arma, una vacía del tamaño inicial. */
  private readonly shown = computed(() => {
    const ref = this.ref();
    const zone = this.zone();
    if (zone?.used && zone.rows !== null && zone.columns !== null) return zone;
    return {
      zone_id: ref?.id ?? '',
      zone: this.zoneName(),
      used: true,
      rows: DEFAULT_ROWS,
      columns: DEFAULT_COLUMNS,
    };
  });
  protected readonly rows = computed(() => this.shown().rows ?? DEFAULT_ROWS);
  protected readonly columns = computed(() => this.shown().columns ?? DEFAULT_COLUMNS);
  /** La mesa de reserva que la técnica no lleva (`used: false`). */
  protected readonly notCarried = computed(() => this.isReserve() && this.zone()?.used === false);

  private readonly zoneItems = computed(() => {
    const ref = this.ref();
    return ref ? itemsOfZone(this.data().items, ref.id) : [];
  });
  protected readonly table = computed(() => editorTable(this.shown(), this.data().items));
  /** Los objetos de la mesa, por número, con su lugar. */
  protected readonly objects = computed(() =>
    this.table().items.map((tableItem) => {
      const index = Number(tableItem.id);
      const item = this.data().items[index];
      return {
        index,
        number: tableItem.legendNumber,
        name: tableItem.name,
        place: placeText(item),
        placed: item.cells.length > 0,
      };
    }),
  );
  protected readonly hint = computed(() => tableHint(this.zoneItems().map(({ item }) => item)));
  protected readonly cells = computed<Cell[]>(() => {
    const ref = this.ref();
    const names = new Map(this.objects().map((object) => [object.index, object]));
    const result: Cell[] = [];
    for (let row = 1; row <= this.rows(); row++) {
      for (let column = 1; column <= this.columns(); column++) {
        const occupant = ref ? occupantAt(this.data().items, ref.id, row, column) : -1;
        const object = names.get(occupant);
        result.push({
          row,
          column,
          occupant,
          object: object ? { number: object.number, name: object.name } : null,
          label: `Fila ${row}, columna ${column}: ${object ? objectLabel(object) : 'vacía'}`,
        });
      }
    }
    return result;
  });

  /** Aplica un cambio a las mesas y los objetos de la versión. */
  private change(update: (data: TableData, ref: ZoneRef) => TableData): void {
    const ref = this.ref();
    if (!ref || this.readonly()) return;
    this.state.edit((content) => {
      const next = update({ zones: content.zones, items: content.items }, ref);
      return next.zones === content.zones && next.items === content.items
        ? content
        : { ...content, zones: next.zones, items: next.items };
    });
  }

  // ---------- Tamaño y «no lleva» ----------

  protected resize(axis: 'rows' | 'columns', delta: number): void {
    const rows = axis === 'rows' ? clampSize(this.rows() + delta) : this.rows();
    const columns = axis === 'columns' ? clampSize(this.columns() + delta) : this.columns();
    if (rows === this.rows() && columns === this.columns() && this.zone()?.used) return;
    this.closeChoice();
    this.selected.set(null);
    this.change((data, ref) => resizeZone(data, ref, rows, columns));
  }

  protected setNotCarried(value: boolean): void {
    this.closeChoice();
    this.selected.set(null);
    this.picking.set(false);
    this.change((data, ref) =>
      value ? markNotCarried(data, ref) : { zones: ensureZone(data.zones, ref), items: data.items },
    );
  }

  // ---------- Agregar objetos ----------

  protected readonly picking = signal(false);
  protected readonly present = computed(() => {
    const ref = this.ref();
    return ref ? instrumentIdsInZone(this.data().items, ref.id) : new Set<string>();
  });
  /** Los atajos de la mesa de reserva: lo que más usan las técnicas publicadas en su mesa de reserva. */
  protected readonly quick = computed(() =>
    this.isReserve()
      ? mostUsedInZone(
          this.catalog()?.techniques ?? [],
          this.zoneName(),
          this.instruments(),
          QUICK_COUNT,
        )
      : [],
  );
  protected readonly allInstruments = this.instruments;

  protected openPicker(event: Event): void {
    event.stopPropagation();
    this.picking.set(true);
  }

  protected closePicker(): void {
    this.picking.set(false);
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('.add')?.focus(), {
      injector: this.injector,
    });
  }

  protected addObject(instrument: CatalogInstrument): void {
    this.change((data, ref) => addObjectToZone(data, ref, instrument));
  }

  // ---------- Ubicar: tocar ----------

  /** El objeto elegido en la lista para ubicarlo con el siguiente toque a una celda (su posición). */
  protected readonly selected = signal<number | null>(null);
  /** El objeto sobre el que está el puntero en la lista: su pieza se levanta en la mesa. */
  private readonly hovered = signal<number | null>(null);
  protected readonly choice = signal<Choice | null>(null);

  /** La pieza que se levanta en la mesa, por su id en el diagrama (su posición): tenga número o no. */
  protected readonly highlighted = computed(() => {
    const index = this.hovered() ?? this.selected();
    return index === null ? null : String(index);
  });
  /**
   * Lo que dice la línea de ayuda: con un objeto elegido, dónde tocar («Tocar la celda donde va el 3.»; uno
   * sin número, por su nombre: «Tocar la celda donde va Pinza Kelly.»).
   */
  protected readonly helpText = computed(() => {
    const index = this.selected();
    const object = index === null ? undefined : this.objects().find((o) => o.index === index);
    if (!object) return this.hint();
    return object.number === null
      ? `Tocar la celda donde va ${object.name}.`
      : `Tocar la celda donde va el ${object.number}.`;
  });

  protected hover(index: number | null): void {
    this.hovered.set(index);
  }

  protected toggleSelected(index: number, event: Event): void {
    event.stopPropagation();
    if (this.readonly()) return;
    this.closeChoice();
    this.selected.update((current) => (current === index ? null : index));
  }

  protected tapCell(cell: Cell, button: HTMLElement, event: Event): void {
    event.stopPropagation();
    if (this.readonly()) return;
    const selected = this.selected();
    if (selected !== null) {
      this.place(selected, cell.row, cell.column);
      return;
    }
    this.openChoice(cell, button);
  }

  /** Ubica el objeto; `grabbed` es la celda suya por la que se arrastró desde la mesa, si fue así. */
  private place(
    index: number,
    row: number,
    column: number,
    grabbed?: { row: number; column: number },
  ): void {
    this.selected.set(null);
    this.closeChoice();
    this.change((data, ref) => placeObject(data, ref.id, index, row, column, grabbed));
  }

  /**
   * Abre «Qué va aquí» bajo la celda o, si abajo no cabe, sobre ella; nunca encima de la celda: puede
   * salirse de la mesa. Abajo no cabe si el panel pasaría de donde empieza la barra de abajo del editor en
   * su sitio natural (al final de la página, pegada al contenido: lo tapa aunque la ventana tenga sitio).
   * Después se desplaza la página lo justo para que el panel se vea entre el menú de arriba y esa barra.
   */
  private openChoice(cell: Cell, button: HTMLElement): void {
    const stage = button.closest<HTMLElement>('.stage');
    const grid = button.parentElement;
    if (!stage || !grid) return;
    const left = grid.offsetLeft + button.offsetLeft;
    const top = grid.offsetTop + button.offsetTop;
    const band = this.visibleBand();
    const box = button.getBoundingClientRect();
    this.choice.set({
      row: cell.row,
      column: cell.column,
      left,
      top: top + button.offsetHeight + 6,
    });
    afterNextRender(
      () => {
        const panel = this.host.nativeElement.querySelector<HTMLElement>('.choice');
        if (!panel) return;
        const height = panel.offsetHeight;
        const above = box.bottom + 6 + height > band.flowBottom;
        const panelTop = above ? top - height - 6 : top + button.offsetHeight + 6;
        this.choice.set({
          row: cell.row,
          column: cell.column,
          left: Math.max(0, Math.min(left, stage.clientWidth - panel.offsetWidth)),
          top: panelTop,
        });
        // Dónde queda el panel en la ventana, sin esperar a que Angular lo mueva
        const viewportTop = box.top + (panelTop - top);
        this.scrollIntoBand(viewportTop, height, box.height > 0);
        panel.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  /**
   * Lo que se ve de la ventana, en píxeles: `top` es bajo el menú de arriba; `bottom`, sobre la barra del
   * editor pegada al borde de abajo; `flowBottom`, donde empieza esa barra en su sitio natural, justo tras
   * el contenido (al final de la página se queda ahí y no sube más). La barra la da `EDITOR_LAYOUT`.
   */
  private visibleBand(): { top: number; bottom: number; flowBottom: number } {
    const token = window.innerWidth <= MOBILE_WIDTH ? '--size-navbar-mobile' : '--size-navbar';
    const navbar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token));
    const layout = this.layout?.bottomBar();
    const bar = layout?.bar;
    const flow = layout?.content.getBoundingClientRect().bottom;
    const stuck = window.innerHeight - (bar?.offsetHeight ?? 0);
    return {
      top: (Number.isFinite(navbar) ? navbar : 0) + VIEW_MARGIN,
      bottom: stuck - VIEW_MARGIN,
      flowBottom: Math.min(stuck, flow ?? stuck) - VIEW_MARGIN,
    };
  }

  /** Desplaza la página lo justo para que un bloque de esa altura, a esa distancia del borde de arriba, se vea entero. */
  private scrollIntoBand(top: number, height: number, laidOut: boolean): void {
    if (!laidOut || typeof window.scrollBy !== 'function') return;
    const band = this.visibleBand();
    let shift = Math.max(0, top + height - band.bottom);
    if (top - shift < band.top) shift = top - band.top;
    if (shift !== 0) window.scrollBy({ top: shift, behavior: 'instant' });
  }

  protected closeChoice(): void {
    if (this.choice() !== null) this.choice.set(null);
  }

  /** Lo que ofrece «Qué va aquí»: los objetos de la mesa (los sin ubicar primero) y, si la celda tiene uno, vaciarla. */
  protected readonly choiceObjects = computed(() => {
    const choice = this.choice();
    if (!choice) return [];
    const here = this.ref()
      ? occupantAt(this.data().items, this.ref()!.id, choice.row, choice.column)
      : -1;
    return [...this.objects()]
      .sort(
        (a, b) =>
          Number(a.placed) - Number(b.placed) || (a.number ?? Infinity) - (b.number ?? Infinity),
      )
      .map((object) => ({ ...object, here: object.index === here }));
  });
  protected readonly choiceOccupied = computed(() =>
    this.choiceObjects().some((object) => object.here),
  );

  protected chooseObject(index: number): void {
    const choice = this.choice();
    if (choice) this.place(index, choice.row, choice.column);
  }

  protected emptyChoice(): void {
    const choice = this.choice();
    if (!choice) return;
    this.closeChoice();
    this.change((data, ref) => clearCell(data, ref.id, choice.row, choice.column));
  }

  protected escape(): void {
    if (this.choice() !== null) this.closeChoice();
    else if (this.selected() !== null) this.selected.set(null);
  }

  // ---------- Ubicar: arrastrar ----------

  /** La celda bajo el puntero mientras se arrastra, para marcarla. */
  protected readonly over = signal<{ row: number; column: number } | null>(null);
  protected readonly dragging = signal(false);
  /**
   * Las dos listas de arrastre (los objetos y las celdas) solo existen para que CDK dibuje la pieza que
   * viaja con el puntero y deje un hueco: ninguna acepta soltar, la celda la decide `dragEnded`.
   */
  protected readonly acceptNone = (): boolean => false;

  protected dragStarted(): void {
    this.closeChoice();
    this.dragging.set(true);
  }

  protected dragMoved(event: CdkDragMove): void {
    this.over.set(this.cellAt(event.pointerPosition.x, event.pointerPosition.y));
  }

  /**
   * Suelta un objeto (de la lista o de una celda): si cae en una celda, se ubica ahí; si no, vuelve a su
   * sitio. Arrastrado desde la mesa, `grabbed` es la celda por la que se agarró: un objeto de varias celdas
   * la deja en la de destino y no se corre.
   */
  protected dragEnded(
    event: CdkDragEnd,
    index: number,
    grabbed?: { row: number; column: number },
  ): void {
    const target = this.cellAt(event.dropPoint.x, event.dropPoint.y);
    event.source.reset();
    this.over.set(null);
    this.dragging.set(false);
    if (target) this.place(index, target.row, target.column, grabbed);
  }

  /** La celda que está bajo ese punto de la pantalla, medida con las celdas mismas (el objeto arrastrado tapa lo de abajo). */
  private cellAt(x: number, y: number): { row: number; column: number } | null {
    const buttons = this.host.nativeElement.querySelectorAll<HTMLElement>('.cell');
    for (const button of Array.from(buttons)) {
      const box = button.getBoundingClientRect();
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
        return { row: Number(button.dataset['row']), column: Number(button.dataset['column']) };
      }
    }
    return null;
  }
}

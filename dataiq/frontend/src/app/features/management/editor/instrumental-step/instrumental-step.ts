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
import type { EditorItem } from '../../../../domain/editor-content';
import {
  addInstrument,
  catalogGroups,
  categoryChips,
  chosenGroups,
  instrumentIdsIn,
  soleOwnItem,
  suggestions,
  type CatalogInstrument,
} from '../../../../domain/instrumental-picker';
import { removeAt } from '../../../../domain/remove-at';
import { highlight } from '../../../../domain/technique-search';
import { Button } from '../../../../shared/ui/button/button';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { EditorCatalog } from '../editor-catalog';
import { EditorState } from '../editor-state';

/** Cuántos sugeridos se ven antes de «Ver n más». */
const VISIBLE_SUGGESTIONS = 8;

/**
 * El paso «Instrumental» del editor, según «Editor de técnica (página)» de `DESIGN.md` y Resuelto 53 de
 * `dataiq/docs/checklist-frontend.md`. A la derecha, «En esta técnica»: los objetos de la técnica
 * agrupados por la categoría de su primer instrumento, cada uno con su botón de quitar. A la izquierda,
 * una tarjeta con los **sugeridos** de la especialidad (lo que usan sus otras técnicas y esta no tiene,
 * con tres puntos que marcan cuántas lo usan) y, debajo, **«Explorar el catálogo»**: buscador por
 * nombre o alias, chips por tipo y el catálogo completo por categoría.
 *
 * «Agregar» crea un objeto con ese instrumento como único componente, sin mesa ni lugar (las mesas lo
 * ubican después); quitar saca el objeto, y con él su lugar en la mesa. Todo pasa por
 * `EditorState.edit()`, que lo guarda. El catálogo (`GET /catalog/full`) es el de `EditorCatalog`: se pide
 * la primera vez que se abre este paso o uno de las mesas y lo comparten. Con la versión en solo lectura
 * se ve todo y nada se cambia.
 */
@Component({
  selector: 'app-instrumental-step',
  imports: [Button, SearchField],
  templateUrl: './instrumental-step.html',
  styleUrl: './instrumental-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentalStep {
  /** La técnica que se edita (para no sugerirle lo que ya usa su versión publicada) y su especialidad. */
  readonly techniqueId = input.required<string>();
  readonly specialty = input.required<string>();

  private readonly state = inject(EditorState);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly catalogResource = inject(EditorCatalog).use();

  protected readonly readonly = computed(() => !this.state.editable());
  protected readonly items = computed(() => this.state.content()?.items ?? []);

  // ---------- El catálogo ----------

  private readonly catalog = computed(() =>
    this.catalogResource.hasValue() ? this.catalogResource.value() : undefined,
  );
  protected readonly loaded = computed(() => this.catalog() !== undefined);
  /** El catálogo no llegó por un error (el interceptor ya avisó): no se sabe qué hay. */
  protected readonly failed = computed(
    () =>
      !this.loaded() &&
      !this.catalogResource.isLoading() &&
      this.catalogResource.error() !== undefined,
  );
  private readonly instruments = computed<readonly CatalogInstrument[]>(
    () => this.catalog()?.instruments ?? [],
  );
  private readonly categoryOrder = computed(() =>
    (this.catalog()?.categories ?? []).map((category) => category.name),
  );

  protected retry(): void {
    this.catalogResource.reload();
  }

  // ---------- En esta técnica ----------

  protected readonly count = computed(() => this.items().length);
  protected readonly groups = computed(() =>
    chosenGroups(this.items(), this.instruments(), this.categoryOrder()),
  );
  private readonly present = computed(() => instrumentIdsIn(this.items()));
  /** El objeto que se acaba de agregar, para iluminarlo y llevarlo a la vista. */
  protected readonly fresh = signal<EditorItem | null>(null);

  protected remove(index: number): void {
    this.state.edit((content) => ({ ...content, items: removeAt(content.items, index) }));
  }

  // ---------- Sugeridos ----------

  protected readonly showAll = signal(false);
  private readonly allSuggestions = computed(() =>
    suggestions(
      this.specialty(),
      this.techniqueId(),
      this.catalog()?.techniques ?? [],
      this.instruments(),
      this.present(),
    ),
  );
  protected readonly suggested = computed(() =>
    this.showAll() ? this.allSuggestions() : this.allSuggestions().slice(0, VISIBLE_SUGGESTIONS),
  );
  /** Cuántos sugeridos quedan fuera de la vista. */
  protected readonly hiddenSuggestions = computed(() =>
    Math.max(0, this.allSuggestions().length - VISIBLE_SUGGESTIONS),
  );

  protected toggleAll(): void {
    this.showAll.update((all) => !all);
  }

  // ---------- Explorar el catálogo ----------

  protected readonly query = signal('');
  protected readonly category = signal('');
  protected readonly chips = computed(() =>
    categoryChips(this.instruments(), this.query(), this.categoryOrder()),
  );
  protected readonly chipsTotal = computed(() =>
    this.chips().reduce((total, chip) => total + chip.count, 0),
  );
  /** El catálogo que se ve: por categoría, con lo que coincide, y de cada instrumento si ya está y si se puede quitar. */
  protected readonly catalogList = computed(() => {
    const query = this.query();
    const present = this.present();
    return catalogGroups(this.instruments(), query, this.category(), this.categoryOrder()).map(
      (group) => ({
        category: group.category,
        rows: group.instruments.map((instrument) => ({
          instrument,
          segments: highlight(instrument.name, query),
          inTechnique: present.has(instrument.id),
          removable: soleOwnItem(this.items(), instrument.id) !== -1,
        })),
      }),
    );
  });
  protected readonly found = computed(() =>
    this.catalogList().reduce((total, group) => total + group.rows.length, 0),
  );

  protected chooseCategory(category: string): void {
    this.category.set(category);
  }

  // ---------- Agregar y quitar ----------

  /** Agrega el instrumento a la técnica y lleva a la vista el objeto nuevo. */
  protected add(instrument: CatalogInstrument): void {
    if (this.readonly() || this.present().has(instrument.id)) return;
    this.state.edit((content) => ({ ...content, items: addInstrument(content.items, instrument) }));
    this.fresh.set(this.items().at(-1) ?? null);
    afterNextRender(() => this.revealFresh(), { injector: this.injector });
  }

  /**
   * En el catálogo, tocar lo que ya está lo quita si es un único objeto suyo; si solo está dentro de un
   * objeto compuesto, o hay varios objetos suyos (p. ej. uno en cada mesa), no hace nada.
   */
  protected toggle(row: {
    instrument: CatalogInstrument;
    inTechnique: boolean;
    removable: boolean;
  }): void {
    if (this.readonly()) return;
    if (!row.inTechnique) {
      this.add(row.instrument);
    } else if (row.removable) {
      this.state.edit((content) => {
        const index = soleOwnItem(content.items, row.instrument.id);
        return index === -1 ? content : { ...content, items: removeAt(content.items, index) };
      });
    }
  }

  private revealFresh(): void {
    const element = this.host.nativeElement.querySelector<HTMLElement>('.fresh');
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'nearest' });
    }
  }
}

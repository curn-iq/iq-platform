import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  canSave,
  draftOf,
  impactText,
  missingSource,
  ownerOf,
  sortedCategoryNames,
  techniqueNames,
  usageSummary,
  type CatalogCategory,
  type CatalogEntry,
  type EntryDraft,
  type Placement,
} from '../../../../domain/instrument-catalog';
import { plain } from '../../../../domain/technique-search';
import { Button } from '../../../../shared/ui/button/button';
import { ChipList } from '../../../../shared/ui/chip-list/chip-list';
import { SelectField } from '../../../../shared/ui/select-field/select-field';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { InstrumentDrawing, steelDrawingFor } from '../instrument-drawing/instrument-drawing';
import { WhereItGoes } from '../where-it-goes/where-it-goes';

/**
 * Qué se hace con la entrada: leerla, editarla entera, editar solo su descripción («Escribir descripción»)
 * o escribir un instrumento nuevo.
 */
export type EntryMode = 'read' | 'edit' | 'description' | 'new';

/**
 * La entrada de un instrumento del catálogo (`instrumental.html`, «Catálogo de instrumental (página)» en
 * `DESIGN.md`): la ruta con su categoría, el nombre, en cuántas técnicas va, la descripción con su fuente,
 * «También se escribe así» con los alias, su dibujo en acero si lo tiene y «Dónde va». Editar no cambia de
 * pantalla: cada bloque se vuelve editable en su sitio, «Dónde va» queda atenuado y una barra fija dice en
 * qué técnicas publicadas se verá el cambio. Un nombre o un alias que ya es de otro instrumento se avisa y
 * bloquea Guardar; una descripción pide su fuente (Resuelto 62 de `dataiq/docs/checklist-frontend.md`).
 *
 * Solo escribe en el borrador: guardar lo hace quien la use (`saved`).
 */
@Component({
  selector: 'app-instrument-entry',
  imports: [
    Button,
    ChipList,
    InstrumentDrawing,
    RouterLink,
    SelectField,
    TextField,
    TextareaField,
    WhereItGoes,
  ],
  templateUrl: './instrument-entry.html',
  styleUrl: './instrument-entry.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentEntry {
  /** El instrumento; `null` cuando se escribe uno nuevo. */
  readonly entry = input<CatalogEntry | null>(null);
  readonly mode = input<EntryMode>('read');
  readonly placements = input<readonly Placement[]>([]);
  /** Las especialidades en el orden en que se muestran. */
  readonly specialties = input<readonly string[]>([]);
  readonly categories = input<readonly CatalogCategory[]>([]);
  /** Todos los instrumentos, para saber si un nombre o un alias ya es de otro. */
  readonly instruments = input<readonly CatalogEntry[]>([]);
  /** Se está guardando: Guardar no responde a otro toque. */
  readonly saving = input(false);

  /** Se pidió editar la entrada o escribir su descripción. */
  readonly editRequested = output<'edit' | 'description'>();
  readonly cancelled = output<void>();
  readonly saved = output<EntryDraft>();

  protected readonly isNew = computed(() => this.mode() === 'new');
  protected readonly editing = computed(() => this.mode() !== 'read');
  /** Se edita todo: el nombre, la categoría y los alias, además de la descripción. */
  protected readonly editsAll = computed(() => this.mode() === 'edit' || this.mode() === 'new');

  /** Lo escrito; vuelve a lo que dice la entrada al abrirla de nuevo, al cambiar de instrumento o de modo. */
  protected readonly draft = linkedSignal<
    { entry: CatalogEntry | null; mode: EntryMode; categories: readonly CatalogCategory[] },
    EntryDraft
  >({
    source: () => ({ entry: this.entry(), mode: this.mode(), categories: this.categories() }),
    computation: ({ entry, categories }) => draftOf(entry, categories),
  });

  /** El alias que se quiso agregar y ya es de otro instrumento. */
  protected readonly aliasOwner = signal<CatalogEntry | null>(null);

  protected readonly categoryOptions = computed(() => {
    const byName = new Map(this.categories().map((category) => [category.name, category.id]));
    return sortedCategoryNames(byName.keys()).map((name) => ({
      value: byName.get(name)!,
      label: name,
    }));
  });

  /** El instrumento que ya tiene el nombre escrito. */
  protected readonly nameOwner = computed(() =>
    ownerOf(this.instruments(), this.draft().name, this.entry()?.id ?? null),
  );
  protected readonly sourceMissing = computed(() => missingSource(this.draft()));
  protected readonly savable = computed(() => canSave(this.draft(), this.nameOwner()));

  protected readonly summary = computed(() =>
    this.isNew()
      ? 'Instrumento nuevo. Los instrumentos no se borran: se corrigen.'
      : usageSummary(this.placements()),
  );
  protected readonly impact = computed(() =>
    impactText(techniqueNames(this.placements()), this.isNew()),
  );
  protected readonly hasDrawing = computed(() => {
    const entry = this.entry();
    return entry !== null && steelDrawingFor(entry.name) !== null;
  });

  private readonly nameField = viewChild<ElementRef<HTMLInputElement>>('nameField');
  private readonly descriptionField = viewChild(TextareaField);

  constructor() {
    // Al editar, el cursor ya está donde se escribe: la descripción, o el nombre si se edita todo
    effect(() => {
      if (this.mode() === 'description') this.descriptionField()?.focus();
      else this.nameField()?.nativeElement.focus();
    });
    // Lo que se dijo de un alias no vale para otra entrada ni para otro modo
    effect(() => {
      this.entry();
      this.mode();
      this.aliasOwner.set(null);
    });
  }

  /** «Ya existe «Pinza de Allis» (también «Allis»).»: lo que dice el aviso de un nombre o un alias repetido. */
  protected duplicateText(owner: CatalogEntry): string {
    const alias = owner.aliases[0];
    return `Ya existe «${owner.name}»${alias ? ` (también «${alias}»)` : ''}.`;
  }

  protected patch(changes: Partial<EntryDraft>): void {
    this.draft.update((current) => ({ ...current, ...changes }));
  }

  protected onName(event: Event): void {
    this.patch({ name: (event.target as HTMLInputElement).value });
  }

  protected addAlias(value: string): void {
    const alias = value.trim();
    const owner = ownerOf(this.instruments(), alias, this.entry()?.id ?? null);
    this.aliasOwner.set(owner);
    if (owner) return;
    const own = [this.draft().name, ...this.draft().aliases].map(plain);
    if (own.includes(plain(alias))) return;
    this.patch({ aliases: [...this.draft().aliases, alias] });
  }

  protected removeAlias(index: number): void {
    this.aliasOwner.set(null);
    this.patch({ aliases: this.draft().aliases.filter((_, position) => position !== index) });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.savable() && !this.saving()) this.saved.emit(this.draft());
  }
}

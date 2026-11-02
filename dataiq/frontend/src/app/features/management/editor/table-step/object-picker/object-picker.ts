import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import { catalogGroups, type CatalogInstrument } from '../../../../../domain/instrumental-picker';
import { highlight } from '../../../../../domain/technique-search';
import { SearchField } from '../../../../../shared/ui/search-field/search-field';

/**
 * El panel «Agregar a la mesa» de los pasos de las mesas, según «Editor de técnica (página)» de
 * `DESIGN.md`: el catálogo de instrumentos en compacto (buscador por nombre o alias y la lista por
 * categoría) y, si se le pasan, los instrumentos «más usados» como atajos. No guarda nada: avisa con
 * `picked` qué instrumento se eligió y con `closed` que se terminó («Listo» o Escape). Queda abierto tras
 * cada elección para agregar varios seguidos; lo que ya está en la mesa (`present`) se marca y no se repite.
 */
@Component({
  selector: 'app-object-picker',
  imports: [SearchField],
  templateUrl: './object-picker.html',
  styleUrl: './object-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'closed.emit()' },
})
export class ObjectPicker {
  readonly instruments = input.required<readonly CatalogInstrument[]>();
  readonly categoryOrder = input<readonly string[]>([]);
  /** Los instrumentos que ya están en la mesa. */
  readonly present = input<ReadonlySet<string>>(new Set());
  /** Los atajos («Más usados en mesas de reserva»); vacío, no hay atajos. */
  readonly quick = input<readonly CatalogInstrument[]>([]);
  readonly quickLabel = input('');

  readonly picked = output<CatalogInstrument>();
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly query = signal('');
  protected readonly groups = computed(() => {
    const query = this.query();
    const present = this.present();
    return catalogGroups(this.instruments(), query, '', this.categoryOrder()).map((group) => ({
      category: group.category,
      rows: group.instruments.map((instrument) => ({
        instrument,
        segments: highlight(instrument.name, query),
        inTable: present.has(instrument.id),
      })),
    }));
  });

  constructor() {
    const injector = inject(Injector);
    // Al abrirse, el foco va al buscador
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLInputElement>('input')?.focus(),
      { injector },
    );
  }

  protected pick(instrument: CatalogInstrument): void {
    if (!this.present().has(instrument.id)) this.picked.emit(instrument);
  }
}

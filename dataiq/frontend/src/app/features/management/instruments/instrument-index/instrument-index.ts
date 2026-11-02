import { ChangeDetectionStrategy, Component, input, model, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { IndexGroup } from '../../../../domain/instrument-catalog';
import { SearchField } from '../../../../shared/ui/search-field/search-field';

/**
 * El índice del catálogo de instrumental (`instrumental.html`, «Catálogo de instrumental (página)» en
 * `DESIGN.md`): la columna de 300 px del detalle de técnica, con el buscador y «Nuevo instrumento» fijos
 * arriba, una línea que explica la cifra y las categorías con sus instrumentos, cada uno con las
 * técnicas en que va. El elegido va en `marca-claro`; al buscar por alias, el alias que coincidió sale
 * bajo el nombre. En celular se pliega en un selector que dice la categoría y el instrumento abiertos.
 * Elegir un instrumento navega a su ruta y avisa con `chosen`.
 */
@Component({
  selector: 'app-instrument-index',
  imports: [RouterLink, SearchField],
  templateUrl: './instrument-index.html',
  styleUrl: './instrument-index.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentIndex {
  readonly groups = input.required<readonly IndexGroup[]>();
  /** El instrumento abierto; `null` si se está escribiendo uno nuevo. */
  readonly selectedId = input<string | null>(null);
  /** Lo que dice el selector de celular: «Pinza · Pinza Kelly». */
  readonly label = input('Instrumental');
  /** Mientras llega el catálogo. */
  readonly loading = input(false);
  /** Lo que se busca. */
  readonly query = model('');

  /** Se eligió un instrumento: la pantalla vuelve a la lectura. */
  readonly chosen = output<void>();
  /** Se pidió escribir un instrumento nuevo. */
  readonly newRequested = output<void>();

  /** El selector de celular está desplegado. */
  protected readonly open = signal(false);

  protected pick(): void {
    this.open.set(false);
    this.chosen.emit();
  }

  protected requestNew(): void {
    this.open.set(false);
    this.newRequested.emit();
  }
}

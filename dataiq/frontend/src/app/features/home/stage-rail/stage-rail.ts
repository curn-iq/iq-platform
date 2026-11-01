import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { TableItem } from '../../../domain/table';
import { DrawingParts } from '../../../shared/table-diagram/drawing-parts';
import { DRAWINGS, type Part } from '../../../shared/table-diagram/drawings';
import { shapesFor } from '../../../shared/table-diagram/shape-catalog';
import { SteelGradients } from '../../../shared/table-diagram/steel-gradients';
import type { TableView } from '../home-table/home-table';

/** Para que cada dibujo grande tenga sus propios degradados. */
let nextGradient = 0;

/** Las partes del dibujo de la pieza de un objeto, a gran escala; vacío si no tiene dibujo de acero. */
export function macroParts(item: TableItem | null): readonly Part[] {
  const shape = shapesFor(item?.instruments ?? []).find((candidate) => candidate.kind === 'steel');
  return shape?.key ? DRAWINGS[shape.key].parts : [];
}

/**
 * El riel del escenario de la portada, a la derecha de la mesa: según la vista,
 * la pieza elegida en acero a gran escala con su número y su nombre
 * (referencia), lo que se puede hacer con la escena (3D), o la pieza que la
 * cámara dice que hay que mover (cámara). No muestra el texto crudo de la
 * fuente: la web no habla de dónde salen los datos (ver «Escenario de la mesa»
 * en `DESIGN.md`).
 */
@Component({
  selector: 'app-stage-rail',
  imports: [DrawingParts, SteelGradients],
  templateUrl: './stage-rail.html',
  styleUrl: './stage-rail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-view]': 'view()' },
})
export class StageRail {
  readonly view = input.required<TableView>();
  /** El objeto elegido en la mesa. */
  readonly selected = input<TableItem | null>(null);
  /** El objeto que la cámara dice que está fuera de lugar. */
  readonly misplaced = input<TableItem | null>(null);
  readonly pieceCount = input.required<number>();
  readonly listOpen = input(false);
  /** Se pidió abrir o cerrar la lista de todas las piezas. */
  readonly listToggled = output<void>();

  private readonly showAll = viewChild.required<ElementRef<HTMLButtonElement>>('showAll');

  /** Devuelve el foco al botón que abre la lista, p. ej. al cerrarla. */
  focusShowAll(): void {
    this.showAll().nativeElement.focus();
  }

  protected readonly selectedParts = computed(() => macroParts(this.selected()));
  protected readonly misplacedParts = computed(() => macroParts(this.misplaced()));

  private readonly gradient = nextGradient++;
  protected readonly steelId = `rail-steel-${this.gradient}`;
  protected readonly bladeId = `rail-blade-${this.gradient}`;
  protected readonly misplacedSteelId = `rail-mis-steel-${this.gradient}`;
  protected readonly misplacedBladeId = `rail-mis-blade-${this.gradient}`;
}

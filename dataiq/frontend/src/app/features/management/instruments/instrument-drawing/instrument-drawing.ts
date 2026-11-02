import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DrawingParts } from '../../../../shared/table-diagram/drawing-parts';
import { DRAWINGS } from '../../../../shared/table-diagram/drawings';
import { drawingFor } from '../../../../shared/table-diagram/shape-catalog';
import { SteelGradients } from '../../../../shared/table-diagram/steel-gradients';

/** Las partes del dibujo de acero de un instrumento, o `null` si no tiene uno propio. */
export function steelDrawingFor(name: string) {
  const key = drawingFor(name);
  const drawing = key === null ? null : DRAWINGS[key];
  return drawing?.kind === 'steel' ? drawing.parts : null;
}

/** Para que cada dibujo tenga sus propios degradados: dos dibujos en una página no comparten `id`. */
let nextGradient = 0;

/**
 * El dibujo en acero de un instrumento, a la derecha de su entrada (`DESIGN.md`, «Catálogo de
 * instrumental (página)»): el mismo que lo representa en la mesa del detalle (`drawingFor()` elige el
 * dibujo por palabras clave de su nombre). Solo lo tiene un instrumento con dibujo propio y de acero: lo
 * que no tiene no se dibuja ni se le presta el de otro. Es decorativo (`aria-hidden`).
 */
@Component({
  selector: 'app-instrument-drawing',
  imports: [DrawingParts, SteelGradients],
  templateUrl: './instrument-drawing.html',
  styleUrl: './instrument-drawing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentDrawing {
  /** El nombre del instrumento. */
  readonly name = input.required<string>();

  /** Las partes del dibujo de acero, o `null` si el instrumento no tiene uno propio. */
  readonly parts = computed(() => steelDrawingFor(this.name()));

  private readonly gradient = nextGradient++;
  protected readonly steelId = `instrument-steel-${this.gradient}`;
  protected readonly bladeId = `instrument-blade-${this.gradient}`;
}

import { Component, computed, input, output } from '@angular/core';
import type { FlowState } from '../../domain/flow';
import { canCommit } from '../../domain/flow';
import { AppButton } from '../../ui/button';
import { Group } from '../../ui/group';

/**
 * Lo de abajo de la cámara mientras se encuadra y se arma: «Encuadra la mesa.» hasta que se ven
 * los cuatro marcadores y, desde ahí, «Arma la mesa.» con «Ya armé la mesa» activo. Al pulsarlo se
 * espera a que el resultado se fije (`domain/flow.ts`).
 */
@Component({
  selector: 'app-framing-panel',
  imports: [AppButton, Group],
  templateUrl: './framing-panel.html',
  styleUrl: './framing-panel.scss',
})
export class FramingPanel {
  readonly flow = input.required<FlowState>();
  /** Se pulsó «Ya armé la mesa». */
  readonly ready = output<void>();

  protected readonly markers = computed(() => this.flow().markers);
  protected readonly canCommit = computed(() => canCommit(this.flow()));
  protected readonly committed = computed(() => this.flow().committed);
  /** Con los cuatro marcadores a la vista se arma; antes, se encuadra. */
  protected readonly assembling = computed(() => this.flow().screen === 'assembling');

  protected readonly eyebrow = computed(() => {
    if (this.committed()) return 'Comparando';
    return this.assembling() ? 'Mesa a la vista' : 'Antes de comparar';
  });

  protected readonly title = computed(() => {
    if (this.committed()) return 'Revisando la mesa.';
    return this.assembling() ? 'Arma la mesa.' : 'Encuadra la mesa.';
  });

  protected readonly lead = computed(() => {
    if (this.committed()) return 'Mantén el celular quieto un momento.';
    return this.assembling()
      ? 'SIVRI nombra lo que ve. Cuando termines, pulsa «Ya armé la mesa».'
      : 'Sostén el celular paralelo a la mesa, hasta que se vean los cuatro marcadores de las esquinas.';
  });

  /** Lo que dice el grupo «Marcadores». */
  protected readonly markersText = computed(() => {
    const { phrase, hint } = this.markers();
    return phrase ? `${phrase} ${hint}` : 'Los cuatro marcadores se ven.';
  });

  protected readonly hint = computed(() => {
    if (this.committed()) return 'SIVRI compara la mesa con las cinco técnicas.';
    return this.canCommit() ? '' : 'Se activa cuando se ven los cuatro marcadores.';
  });
}

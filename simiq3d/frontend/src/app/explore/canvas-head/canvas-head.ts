import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { TechniqueSummary } from '../../data/api/models';

/**
 * La cabeza del lienzo: el nombre de la técnica, la línea de su mesa, el
 * selector de técnica y la marca de lo provisional («Lienzo de SIMIQ3D» en
 * `DESIGN.md`). En celular el nombre es el selector y abre la hoja inferior.
 */
@Component({
  selector: 'app-canvas-head',
  templateUrl: './canvas-head.html',
  styleUrl: './canvas-head.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasHead {
  /** El nombre de la técnica abierta, o «Explorar en 3D» sin técnica. */
  readonly title = input.required<string>();
  /** «Mesa de Mayo · Cirugía General»; nada sin técnica. */
  readonly meta = input<string | null>(null);
  /** Las técnicas que SIMIQ3D muestra en 3D. */
  readonly techniques = input.required<readonly TechniqueSummary[]>();
  readonly currentId = input<string | undefined>();
  readonly mobile = input(false);
  readonly choose = output<string>();
  readonly openSheet = output<void>();

  /** Si la técnica abierta está en el selector; si no, el selector dice «Elegir técnica». */
  protected readonly listed = computed(() =>
    this.techniques().some((technique) => technique.id === this.currentId()),
  );

  protected onChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id) this.choose.emit(id);
  }
}

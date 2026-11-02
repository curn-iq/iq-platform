import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { TechniqueSummary } from '../../data/api/models';

/**
 * En celular, la técnica se elige en una hoja que sube desde abajo, no en el
 * desplegable nativo («Hoja inferior» en `DESIGN.md`).
 */
@Component({
  selector: 'app-technique-sheet',
  templateUrl: './technique-sheet.html',
  styleUrl: './technique-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.open]': 'open()', '(keydown.escape)': 'open.set(false)' },
})
export class TechniqueSheet {
  readonly techniques = input.required<readonly TechniqueSummary[]>();
  readonly currentId = input<string | undefined>();
  readonly open = model(false);
  readonly choose = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Al abrirse, el foco va a la técnica abierta (o a la primera)
    afterRenderEffect(() => {
      if (!this.open()) return;
      const options = this.host.nativeElement.querySelectorAll<HTMLButtonElement>('.option');
      const current = Array.from(options).find((o) => o.getAttribute('aria-current') === 'true');
      (current ?? options[0])?.focus();
    });
  }

  protected pick(id: string): void {
    this.open.set(false);
    this.choose.emit(id);
  }
}

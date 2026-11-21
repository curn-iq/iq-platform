import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { TechniqueSummary } from '../../data/api/models';

/**
 * La cabeza del lienzo: el nombre de la técnica, la línea de su mesa y el
 * selector de técnica («Lienzo de SIMIQ3D» en `DESIGN.md`). En celular el nombre es el selector y abre la hoja inferior.
 */
@Component({
  selector: 'app-canvas-head',
  templateUrl: './canvas-head.html',
  styleUrl: './canvas-head.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:pointerdown)': 'closeOutside($event)' },
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

  /** Lo que dice el selector cerrado. */
  protected readonly label = computed(
    () =>
      this.techniques().find((technique) => technique.id === this.currentId())?.name ??
      'Elegir técnica',
  );

  /** La lista de técnicas abierta, y la opción marcada con el puntero o las flechas. */
  protected readonly open = signal(false);
  protected readonly active = signal(0);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  protected select(id: string): void {
    this.close();
    this.choose.emit(id);
  }

  /** Teclado del selector (patrón de lista desplegable de WAI-ARIA, con el foco en el botón). */
  protected onKeydown(event: KeyboardEvent): void {
    const last = this.techniques().length - 1;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.open()) return this.show();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.active.update((index) => Math.min(last, Math.max(0, index + step)));
        return;
      }
      case 'Home':
      case 'End':
        if (!this.open()) return;
        event.preventDefault();
        this.active.set(event.key === 'Home' ? 0 : last);
        return;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (!this.open()) return this.show();
        const technique = this.techniques()[this.active()];
        if (technique) this.select(technique.id);
        return;
      }
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
        }
        return;
      case 'Tab':
        this.close();
        return;
    }
  }

  protected closeOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private show(): void {
    const index = this.techniques().findIndex((technique) => technique.id === this.currentId());
    this.active.set(Math.max(0, index));
    this.open.set(true);
  }

  private close(): void {
    this.open.set(false);
  }
}

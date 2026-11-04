import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  signal,
  viewChildren,
} from '@angular/core';

/** Una opción del control: `key` la identifica y `count` es la cifra que la acompaña. */
export interface SegmentOption {
  readonly key: string;
  readonly label: string;
  readonly count?: number;
}

/**
 * Control segmentado, según «Mis borradores (página)» de `DESIGN.md`: botones en un estuche
 * con filete y radio 12, con la placa `marca-claro` que se desliza bajo el elegido (`.45s
 * expo`). Cada botón lleva `aria-pressed` y su cifra en tabulares. En celular (≤ 760 px)
 * pasa a chips de 40 px que se desplazan, el elegido lleno en `marca`. La opción elegida es
 * `value`, con `[(value)]`.
 */
@Component({
  selector: 'app-segmented-control',
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.scss',
  host: {
    '(window:resize)': 'measure()',
    '[class.fill]': 'fill()',
    '[class.disabled]': 'disabled()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControl {
  /** Lo que dice el grupo para quien no lo ve. */
  readonly label = input.required<string>();
  /**
   * Ocupa todo el ancho que le dan, con las opciones iguales, sobre `fondo` y sin filete, y no
   * pasa a chips en celular: el selector de rol de la ficha de Usuarios y roles.
   */
  readonly fill = input(false);
  /**
   * No deja elegir otra opción: los botones se deshabilitan y el control se atenúa al 60 %. Es el
   * selector de rol de la cuenta propia en Usuarios y roles.
   */
  readonly disabled = input(false);
  readonly options = input.required<readonly SegmentOption[]>();
  /** El `key` de la opción elegida. */
  readonly value = model.required<string>();

  private readonly injector = inject(Injector);
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('button');

  private readonly selectedIndex = computed(() =>
    this.options().findIndex((option) => option.key === this.value()),
  );

  protected readonly plateLeft = signal(0);
  protected readonly plateWidth = signal(0);
  /** La placa no se anima hasta que se colocó por primera vez. */
  protected readonly plateReady = signal(false);
  private readonly remeasured = signal(0);

  constructor() {
    afterRenderEffect(() => {
      // Se vuelve a colocar al cambiar de opción, al cambiar el tamaño o al cargar la letra
      this.selectedIndex();
      this.remeasured();
      this.buttons();
      this.place();
    });
    afterNextRender(() => {
      // El ancho de cada botón cambia cuando la tipografía termina de cargar
      document.fonts?.ready.then(() => this.measure());
    });
  }

  protected measure(): void {
    this.remeasured.update((count) => count + 1);
  }

  protected choose(key: string): void {
    this.value.set(key);
  }

  private place(): void {
    const button = this.buttons()[this.selectedIndex()]?.nativeElement;
    if (!button) return;
    this.plateLeft.set(button.offsetLeft);
    this.plateWidth.set(button.offsetWidth);
    if (!this.plateReady()) {
      // Se deja pintar la primera posición sin transición antes de activarla
      afterNextRender(() => this.plateReady.set(true), { injector: this.injector });
    }
  }
}

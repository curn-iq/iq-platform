import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

/** Para que cada lista enlace su propia etiqueta: dos en una página no comparten id. */
let nextId = 0;

/**
 * Una lista de nombres editable, según «Editor de técnica (página)» de `DESIGN.md` (equipos y equipo
 * médico-quirúrgico): fichas de 36 px sobre `fondo` con su botón de quitar de 28 px y, al final,
 * «Agregar» con contorno punteado `filete-2`. «Agregar» abre una ficha para escribir: Enter o salir
 * del campo la fijan, y Escape la descarta. Sin nada escrito no se agrega nada. Solo avisa
 * (`added`, `removed`): quien la usa decide qué hacer con el nombre, p. ej. no repetirlo. Con
 * `readonly` solo se leen las fichas.
 */
@Component({
  selector: 'app-chip-list',
  templateUrl: './chip-list.html',
  styleUrl: './chip-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipList {
  /** El título de la lista, que también la nombra para quien no la ve. */
  readonly label = input.required<string>();
  /** Lo que dice, para quien no lo ve, la ficha que se escribe («Nuevo equipo»). */
  readonly inputLabel = input.required<string>();
  readonly names = input.required<readonly string[]>();
  readonly readonly = input(false, { transform: booleanAttribute });

  /** Un nombre escrito y fijado, tal cual (sin recortar). */
  readonly added = output<string>();
  /** La posición de la ficha que se quitó. */
  readonly removed = output<number>();

  protected readonly id = `chip-list-${nextId++}`;
  protected readonly adding = signal(false);

  private readonly injector = inject(Injector);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  /** Escape descarta lo escrito, y perder el foco después no debe fijarlo. */
  private cancelled = false;

  protected startAdding(): void {
    this.cancelled = false;
    this.adding.set(true);
    afterNextRender(() => this.field()?.nativeElement.focus(), { injector: this.injector });
  }

  protected commit(): void {
    const field = this.field()?.nativeElement;
    if (!field || !this.adding()) return;
    const value = field.value;
    this.adding.set(false);
    if (!this.cancelled && value.trim() !== '') this.added.emit(value);
  }

  protected cancel(): void {
    this.cancelled = true;
    this.adding.set(false);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commit();
    } else if (event.key === 'Escape') {
      // Escape no debe cerrar también lo que hay alrededor
      event.stopPropagation();
      this.cancel();
    }
  }
}

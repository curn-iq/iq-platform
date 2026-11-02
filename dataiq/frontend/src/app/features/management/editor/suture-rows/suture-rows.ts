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
  viewChildren,
} from '@angular/core';
import type { EditorSuture } from '../../../../domain/editor-content';
import {
  removeSutureLabel,
  sutureRowNeedsName,
  type SutureRowField,
} from '../../../../domain/suture-rows';

/** Para que cada lista enlace su propio título: dos en una página no comparten id. */
let nextId = 0;

/** Un cambio en una fila: cuál, qué campo y con qué texto. */
export interface SutureRowChange {
  index: number;
  field: SutureRowField;
  value: string;
}

/** Lo que dice la pastilla del título mientras no hay ninguna sutura. */
const MISSING = 'Falta';

/**
 * «Suturas por plano» del paso de datos clínicos, según «Editor de técnica (página)» de `DESIGN.md` y
 * Resuelto 29 de `dataiq/docs/checklist-frontend.md`: una fila por plano con su plano, sutura,
 * calibre y aguja, separadas por filete. Todas se editan en su sitio y cada una tiene su botón de quitar
 * de 28 px; «Agregar plano» (contorno punteado) suma una fila vacía y le da el foco al plano. A una fila
 * con otros datos y sin sutura se le dice «Falta la sutura.»: sin nombre no se guarda. Solo avisa
 * (`changed`, `added`, `removed`): quien la usa decide qué hacer. Con `readonly` solo se leen.
 */
@Component({
  selector: 'app-suture-rows',
  templateUrl: './suture-rows.html',
  styleUrl: './suture-rows.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SutureRows {
  readonly rows = input.required<readonly EditorSuture[]>();
  /** Todavía no hay ninguna sutura con nombre: el título lleva la pastilla «Falta». */
  readonly missing = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });

  readonly changed = output<SutureRowChange>();
  readonly added = output<void>();
  readonly removed = output<number>();

  protected readonly id = `suture-rows-${nextId++}`;
  protected readonly missingText = MISSING;

  private readonly injector = inject(Injector);
  private readonly planes = viewChildren<ElementRef<HTMLInputElement>>('plane');

  protected needsName(row: EditorSuture): boolean {
    return sutureRowNeedsName(row);
  }

  protected removeLabel(row: EditorSuture): string {
    return removeSutureLabel(row);
  }

  protected edit(index: number, field: SutureRowField, event: Event): void {
    this.changed.emit({ index, field, value: (event.target as HTMLInputElement).value });
  }

  protected add(): void {
    this.added.emit();
    // La fila nueva aparece con el siguiente dibujo: el foco va a su plano
    afterNextRender(() => this.planes().at(-1)?.nativeElement.focus(), { injector: this.injector });
  }
}

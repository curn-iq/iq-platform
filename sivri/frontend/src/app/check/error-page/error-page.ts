import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { ErrorKind } from '../../domain/flow';
import { AppButton } from '../../ui/button';
import { ArrowLink } from '../../ui/arrow-link';
import { ERROR_COPY } from './error-copy';

/**
 * Una página de estado: titular, párrafo y una acción, sin pictogramas. Va con la barra del
 * shell, como en los mockups. El titular recibe el foco al aparecer, para que el lector de
 * pantalla lo lea.
 */
@Component({
  selector: 'app-error-page',
  imports: [AppButton, ArrowLink],
  templateUrl: './error-page.html',
  styleUrl: './error-page.scss',
})
export class ErrorPage {
  readonly kind = input.required<ErrorKind>();
  /** «Intentar de nuevo»: otra vez desde el permiso de la cámara. */
  readonly restart = output<void>();
  /** «Revisar de nuevo»: otra vez a encuadrar, con la cámara ya abierta. */
  readonly review = output<void>();
  /** «Ingresar»: al ingreso del shell. */
  readonly login = output<void>();

  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');
  protected readonly copy = computed(() => ERROR_COPY[this.kind()]);

  constructor() {
    afterNextRender(() => this.title().nativeElement.focus());
  }

  protected act(): void {
    const { action } = this.copy().primary;
    if (action === 'restart') this.restart.emit();
    else if (action === 'review') this.review.emit();
    else this.login.emit();
  }
}

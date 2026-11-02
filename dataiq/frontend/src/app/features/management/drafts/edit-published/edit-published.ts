import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { PublishedPanel } from './published-panel';

/**
 * «Editar una publicada», el botón de Mis borradores que abre el panel con las técnicas
 * publicadas (`PublishedPanel`). Se cierra con Escape (el foco vuelve al botón) y con un clic fuera;
 * elegir una técnica cambia de página y lo cierra.
 */
@Component({
  selector: 'app-edit-published',
  imports: [Button, PublishedPanel],
  template: `
    <button
      #trigger
      app-button
      variant="soft"
      type="button"
      aria-controls="published-panel"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
    >
      Editar una publicada
    </button>
    @if (open()) {
      <app-published-panel id="published-panel" />
    }
  `,
  styles: `
    // Sin posición propia: el panel se ancla al grupo de botones de Mis borradores
    :host {
      display: inline-block;
    }

    @media (max-width: 760px) {
      :host {
        display: block;
      }

      button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeOnOutsideClick($event)',
    '(document:keydown.escape)': 'closeOnEscape()',
  },
})
export class EditPublished {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  // `#trigger` está en un `app-button`: sin `read`, la referencia sería la del componente
  private readonly trigger = viewChild.required('trigger', { read: ElementRef<HTMLButtonElement> });

  protected readonly open = signal(false);

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected closeOnOutsideClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node))
      this.open.set(false);
  }

  protected closeOnEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }
}

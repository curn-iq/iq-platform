import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { TechniqueSummary } from '../data/api/models';

/** Hasta dónde crece el campo mientras se escribe. */
const MAX_HEIGHT_PX = 120;

/**
 * El campo de pregunta, la acción principal de la pantalla. Sin técnica abierta
 * es la bienvenida: «Elige una técnica para verla en 3D», con una opción por
 * técnica. Debajo va el aviso del registro de conversaciones, que es el aviso de
 * privacidad del chat (`simiq3d/README.md`, «Backend y base de datos»).
 */
@Component({
  selector: 'app-chat-field',
  templateUrl: './chat-field.html',
  styleUrl: './chat-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.empty]': 'empty()' },
})
export class ChatField {
  /** Sin técnica abierta: la bienvenida. */
  readonly empty = input(false);
  /** Las técnicas que se ofrecen en la bienvenida. */
  readonly techniques = input<readonly TechniqueSummary[]>([]);
  /** El chat no está disponible: el campo no deja escribir. */
  readonly disabled = input(false);
  readonly choose = output<string>();
  readonly ask = output<string>();
  readonly openHistory = output<void>();

  protected readonly text = signal('');

  protected onInput(event: Event): void {
    const area = event.target as HTMLTextAreaElement;
    this.text.set(area.value);
    // Crece con lo escrito hasta 120 px; después se desplaza
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, MAX_HEIGHT_PX)}px`;
  }

  /** Enter envía; Mayúsculas + Enter salta de línea. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    this.send(event.target as HTMLTextAreaElement);
  }

  protected send(area: HTMLTextAreaElement): void {
    const question = this.text().trim();
    if (!question || this.disabled()) return;
    this.ask.emit(question);
    this.text.set('');
    area.value = '';
    area.style.height = 'auto';
  }
}

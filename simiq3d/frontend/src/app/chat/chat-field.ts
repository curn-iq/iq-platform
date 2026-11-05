import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Typing } from './typing';

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
  imports: [Typing],
  styleUrl: './chat-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.empty]': 'empty()', '[class.no-last]': '!showLast()' },
})
export class ChatField {
  /** Sin técnica abierta: la bienvenida. */
  readonly empty = input(false);
  /** Las técnicas que se ofrecen en la bienvenida. */
  readonly techniques = input<readonly { id: string; name: string }[]>([]);
  /**
   * Se espera la respuesta: no se envía otra. Aunque el chat no haya respondido
   * la última vez, el campo sigue activo: la única forma de saber si volvió es
   * preguntar otra vez (el backend no lo dice antes). En celular, los tres
   * puntos van en lugar de la última respuesta.
   */
  readonly busy = input(false);
  /** Todavía no llega ni una frase: en celular, los tres puntos en lugar de la última respuesta. */
  readonly waiting = input(false);
  /** En celular, la última respuesta encima del campo, con sus opciones. */
  readonly last = input<{ text: string; options: readonly string[] } | null>(null);
  /** La última respuesta no se repite con el historial o la ficha abiertos. */
  readonly showLast = input(true);
  readonly choose = output<string>();
  readonly ask = output<string>();
  readonly openHistory = output<void>();
  /** El historial está subido: el mismo botón lo cierra. */
  readonly historyOpen = input(false);
  readonly closeHistory = output<void>();

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
    if (!question || this.busy()) return;
    this.ask.emit(question);
    this.text.set('');
    area.value = '';
    area.style.height = 'auto';
  }
}

import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/**
 * El panel del chat: su cabeza y la conversación. En escritorio es el panel
 * lateral del banco de trabajo; en celular es el historial, que entra desde la
 * izquierda («Chat de SIMIQ3D» en `DESIGN.md`).
 */
@Component({
  selector: 'app-chat-history',
  templateUrl: './chat-history.html',
  styleUrl: './chat-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'complementary', 'aria-label': 'Chat de SIMIQ3D' },
})
export class ChatHistory {
  /** Cerrar el historial (en celular). */
  readonly close = output<void>();
}

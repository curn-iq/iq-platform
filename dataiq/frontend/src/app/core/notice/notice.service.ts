import { Injectable, signal } from '@angular/core';

/** `error`: algo salió mal; `confirmation`: la acción se hizo. */
export type NoticeKind = 'error' | 'confirmation';

export interface Notice {
  readonly id: number;
  readonly kind: NoticeKind;
  /** Una línea por mensaje (p. ej. cada cosa que no cuadra en un 422). */
  readonly messages: readonly string[];
}

/**
 * Avisos en pantalla. Solo guarda cuáles hay; quien los dibuja es el componente
 * de `shared/ui/`, que recibe `notices` y avisa con `dismiss`.
 */
@Injectable({ providedIn: 'root' })
export class NoticeService {
  private readonly list = signal<readonly Notice[]>([]);
  private nextId = 1;

  readonly notices = this.list.asReadonly();

  /**
   * Agrega un aviso. Si ya hay uno igual a la vista (varias peticiones que
   * fallan a la vez dan el mismo error), no se repite.
   */
  show(kind: NoticeKind, messages: readonly string[]): void {
    const repeated = this.list().some(
      (notice) =>
        notice.kind === kind &&
        notice.messages.length === messages.length &&
        notice.messages.every((message, i) => message === messages[i]),
    );
    if (repeated) return;
    this.list.update((notices) => [...notices, { id: this.nextId++, kind, messages }]);
  }

  dismiss(id: number): void {
    this.list.update((notices) => notices.filter((notice) => notice.id !== id));
  }
}

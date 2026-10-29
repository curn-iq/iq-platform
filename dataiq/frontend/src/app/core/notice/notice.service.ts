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
 * Cuántos errores caben a la vez. Un error se queda hasta que se cierra, así
 * que sin tope se apilarían (p. ej. un 422 distinto en cada autoguardado) hasta
 * salirse de la pantalla.
 */
export const MAX_ERRORS = 3;

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
   * Agrega un aviso; uno sin mensajes no se muestra.
   * - Un error igual a uno a la vista no se repite (varias peticiones que fallan
   *   a la vez dan el mismo). Si ya hay `MAX_ERRORS`, se va el más antiguo.
   * - Una confirmación igual a una a la vista la reemplaza, para que vuelva a
   *   contar su tiempo (guardar dos veces seguidas confirma las dos).
   */
  show(kind: NoticeKind, messages: readonly string[]): void {
    if (messages.length === 0) return;
    const same = (notice: Notice) =>
      notice.kind === kind &&
      notice.messages.length === messages.length &&
      notice.messages.every((message, i) => message === messages[i]);

    if (kind === 'error' && this.list().some(same)) return;
    this.list.update((notices) => {
      let kept = notices.filter((notice) => !same(notice));
      if (kind === 'error') {
        const errors = kept.filter((notice) => notice.kind === 'error');
        const excess = errors.length - (MAX_ERRORS - 1);
        if (excess > 0) {
          const dropped = new Set(errors.slice(0, excess).map((notice) => notice.id));
          kept = kept.filter((notice) => !dropped.has(notice.id));
        }
      }
      return [...kept, { id: this.nextId++, kind, messages }];
    });
  }

  dismiss(id: number): void {
    this.list.update((notices) => notices.filter((notice) => notice.id !== id));
  }
}

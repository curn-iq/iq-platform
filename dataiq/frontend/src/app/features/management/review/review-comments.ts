import { computed, Injectable, signal } from '@angular/core';
import {
  buildReason,
  flattenLines,
  sortedComments,
  targetSection,
  type CommentTarget,
  type ReviewComment,
} from '../../../domain/review-comments';
import type { SectionKey } from '../../../domain/version-progress';

/**
 * Los comentarios que el revisor va escribiendo en la pantalla de revisión y su nota general. Solo
 * viven en pantalla (guardarlos aparte es de después del MVP, Resuelto 18 de
 * `dataiq/docs/checklist-frontend.md`): al devolver la versión se juntan en el motivo
 * (`domain/review-comments.ts`). Lo provee `Review`, así que cada revisión empieza sin nada.
 */
@Injectable()
export class ReviewComments {
  private nextId = 1;

  readonly comments = signal<readonly ReviewComment[]>([]);
  /** La nota general de «Devolver». */
  readonly note = signal('');
  /** Sobre qué se está escribiendo un comentario ahora, o `null`. Solo hay uno a la vez. */
  readonly composing = signal<CommentTarget | null>(null);

  readonly count = computed(() => this.comments().length);
  /** Los comentarios en el orden de las secciones y, dentro de cada una, en el que se escribieron. */
  readonly sorted = computed(() => sortedComments(this.comments()));
  /** El motivo con el que se devolvería la versión ahora. */
  readonly reason = computed(() => buildReason(this.comments(), this.note()));
  /** Hay algo que decir: un comentario o la nota general. */
  readonly canReturn = computed(() => this.reason() !== '');
  /** Los números de los objetos de la mesa de Mayo y de la de reserva que ya tienen un comentario. */
  readonly commentedMayo = computed(() => this.commentedNumbers('mayo'));
  readonly commentedReserve = computed(() => this.commentedNumbers('reserve'));

  /** Los comentarios de una sección. */
  of(section: SectionKey): ReviewComment[] {
    return this.sorted().filter((comment) => targetSection(comment.target) === section);
  }

  private commentedNumbers(section: 'mayo' | 'reserve'): number[] {
    return this.comments().flatMap(({ target }) =>
      target.kind === 'object' && target.section === section && target.number !== null
        ? [target.number]
        : [],
    );
  }

  /** Empieza a escribir un comentario sobre algo; si ya había uno abierto, se cambia a este. */
  compose(target: CommentTarget): void {
    this.composing.set(target);
  }

  cancel(): void {
    this.composing.set(null);
  }

  /** Guarda el comentario que se estaba escribiendo. Sin texto no guarda nada y devuelve `false`. */
  add(text: string): boolean {
    const target = this.composing();
    if (target === null || flattenLines(text) === '') return false;
    this.comments.update((all) => [...all, { id: this.nextId++, target, text: text.trim() }]);
    this.composing.set(null);
    return true;
  }

  remove(id: number): void {
    this.comments.update((all) => all.filter((comment) => comment.id !== id));
  }

  /** Olvida todo: se revisa otra versión. */
  clear(): void {
    this.comments.set([]);
    this.note.set('');
    this.composing.set(null);
  }
}

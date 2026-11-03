import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  commentSubject,
  targetSection,
  type CommentTarget,
} from '../../../../domain/review-comments';
import { VERSION_SECTIONS } from '../../../../domain/editor-steps';
import type { SectionKey } from '../../../../domain/version-progress';
import { Button } from '../../../../shared/ui/button/button';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { CommentButton } from '../comment-button/comment-button';
import { ReviewComments } from '../review-comments';

/**
 * Los comentarios de una sección de la revisión, al pie de su hoja: los que ya se escribieron, cada
 * uno con su botón para quitarlo; el redactor del que se está escribiendo (sobre un campo, un
 * objeto o la sección entera) y «Comentar la sección». Ver «Versiones por revisar (página)» en
 * `DESIGN.md`; los comentarios viven en `ReviewComments`.
 */
@Component({
  selector: 'app-section-comments',
  imports: [Button, CommentButton, TextareaField],
  templateUrl: './section-comments.html',
  styleUrl: './section-comments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionComments {
  protected readonly comments = inject(ReviewComments);

  readonly section = input.required<SectionKey>();

  protected readonly sectionName = computed(
    () => VERSION_SECTIONS.find((section) => section.key === this.section())!.name,
  );

  /** Los comentarios ya escritos, con lo que dicen que tratan. */
  protected readonly list = computed(() =>
    this.comments
      .of(this.section())
      .map((comment) => ({ ...comment, subject: commentSubject(comment.target) })),
  );

  /** Sobre qué se escribe un comentario ahora, si es de esta sección. */
  protected readonly composing = computed<CommentTarget | null>(() => {
    const target = this.comments.composing();
    return target !== null && targetSection(target) === this.section() ? target : null;
  });
  protected readonly subject = computed(() => {
    const target = this.composing();
    return target === null ? '' : commentSubject(target);
  });

  /** Lo escrito; se guarda en `ReviewComments` para que sobreviva al cambio de pestaña. */
  protected readonly draft = this.comments.draft;

  private readonly field = viewChild(TextareaField);

  constructor() {
    // Al abrirse el redactor, el cursor ya está en el texto
    effect(() => this.field()?.focus());
  }

  protected save(): void {
    if (!this.comments.add(this.draft())) this.field()?.focus();
  }

  protected compose(): void {
    this.comments.compose({ kind: 'section', section: this.section() });
  }
}

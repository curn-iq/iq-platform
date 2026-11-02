import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { NoticeService } from '../../../../core/notice/notice.service';
import { VersionsRepository } from '../../../../data/versions.repository';
import { commentLine } from '../../../../domain/review-comments';
import { Button } from '../../../../shared/ui/button/button';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { ReviewComments } from '../review-comments';

/** Qué panel de decisión está abierto: se abre uno a la vez. */
type Panel = 'return' | 'approve';

/** Lo que la decisión necesita saber de la versión que se revisa. */
export interface ReviewedVersion {
  id: string;
  technique: string;
  number: number;
  author: string;
}

/**
 * «Devolver con comentarios» y «Aprobar y publicar» de la revisión, cada uno con su panel de
 * confirmación (Resuelto 60 de `dataiq/docs/checklist-frontend.md`). Devolver junta la nota general
 * y los comentarios en el motivo (`POST /versions/{id}/reject`, Resuelto 18) y queda apagado sin
 * ninguno de los dos; aprobar publica la versión (`POST /versions/{id}/approve`). Al terminar avisa y
 * vuelve a Por revisar. Si otro revisor ya decidió (409), el interceptor lo avisa y `conflict`
 * pide a la pantalla que vuelva a mirar la versión. El host no tiene caja (`display: contents`): los
 * botones y los paneles se acomodan en la cuadrícula de la cabecera. Ver «Versiones por revisar
 * (página)» en `DESIGN.md`.
 */
@Component({
  selector: 'app-review-decision',
  imports: [Button, TextareaField],
  templateUrl: './review-decision.html',
  styleUrl: './review-decision.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDecision {
  private readonly repository = inject(VersionsRepository);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);
  protected readonly comments = inject(ReviewComments);

  readonly version = input.required<ReviewedVersion>();
  /** Otro revisor ya decidió: la pantalla tiene que volver a mirar la versión. */
  readonly conflict = output<void>();

  protected readonly panel = signal<Panel | null>(null);
  protected readonly busy = signal(false);

  private readonly returnTrigger = viewChild('returnTrigger', {
    read: ElementRef<HTMLButtonElement>,
  });
  private readonly approveTrigger = viewChild('approveTrigger', {
    read: ElementRef<HTMLButtonElement>,
  });
  private readonly note = viewChild(TextareaField);
  private readonly confirmApprove = viewChild('confirmApprove', {
    read: ElementRef<HTMLButtonElement>,
  });

  protected readonly returnLabel = computed(() => {
    const count = this.comments.count();
    if (count === 0) return 'Devolver con comentarios';
    return count === 1 ? 'Devolver con 1 comentario' : `Devolver con ${count} comentarios`;
  });

  /** Las líneas del motivo que se enviarán, para que el revisor vea lo que dice. */
  protected readonly lines = computed(() => this.comments.sorted().map(commentLine));

  /** La versión 1 es una técnica que entra al catálogo; de la 2 en adelante, reemplaza a la anterior. */
  protected readonly isFirst = computed(() => this.version().number === 1);
  protected readonly previous = computed(() => this.version().number - 1);

  constructor() {
    // Al abrirse un panel, el foco va a lo primero que se hace en él
    effect(() => {
      this.note()?.focus();
      this.confirmApprove()?.nativeElement.focus();
    });
  }

  protected toggle(panel: Panel): void {
    this.panel.update((current) => (current === panel ? null : panel));
  }

  /** Cierra el panel y devuelve el foco al botón que lo abrió. */
  protected close(): void {
    const panel = this.panel();
    this.panel.set(null);
    (panel === 'return' ? this.returnTrigger() : this.approveTrigger())?.nativeElement.focus();
  }

  protected approve(): void {
    const { id, technique, number } = this.version();
    this.send(this.repository.approve(id), `${technique} versión ${number} publicada.`);
  }

  protected reject(): void {
    if (!this.comments.canReturn()) return;
    const { id, technique, number, author } = this.version();
    this.send(
      this.repository.reject(id, this.comments.reason()),
      `${technique} versión ${number} devuelta a ${author}.`,
    );
  }

  private send(request: Observable<void>, message: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.notices.show('confirmation', [message]);
        void this.router.navigateByUrl('/gestion/revision');
      },
      error: (error: unknown) => {
        // Los demás errores ya los avisó el interceptor y el panel se queda como estaba
        this.busy.set(false);
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.panel.set(null);
          this.conflict.emit();
        }
      },
    });
  }
}

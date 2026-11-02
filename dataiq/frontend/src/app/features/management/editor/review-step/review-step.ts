import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NoticeService } from '../../../../core/notice/notice.service';
import type { VersionSummary } from '../../../../data/api/models';
import { VersionsRepository } from '../../../../data/versions.repository';
import { blockReason, reviewSections } from '../../../../domain/review-summary';
import type { Role } from '../../../../domain/role';
import { versionProgress } from '../../../../domain/version-progress';
import { Button } from '../../../../shared/ui/button/button';
import { ProgressMark } from '../../../../shared/ui/progress-mark/progress-mark';
import { EditorState } from '../editor-state';

/** Lo que dice el aviso al mandar una versión a revisión. */
export const SUBMITTED = 'Enviada a revisión.';

/** Lo que dice el aviso al publicar una técnica. */
export const publishedNotice = (technique: string): string =>
  `«${technique}» se publicó y ya está en el catálogo.`;

/**
 * El último paso del editor, según «Editor de técnica (página)» de `DESIGN.md` y Resuelto 55 de
 * `dataiq/docs/checklist-frontend.md`. A la izquierda, el resumen de las cuatro secciones con su marca,
 * lo que dice cada una y «Completar» en las que bloquean. A la derecha, la tarjeta de envío: un
 * colaborador lo manda a revisión (`POST /versions/{id}/submit`); un revisor o un admin publica lo suyo
 * (`POST /versions/{id}/publish`) tras una confirmación en la misma tarjeta. El botón queda bloqueado,
 * con el motivo, mientras alguna sección esté en curso o pendiente (Resuelto 22); «sin mesa» no bloquea.
 * No hay nota para el revisor ni nota de la versión (Resuelto 18).
 *
 * Antes de enviar o publicar se espera a que termine el guardado pendiente. Al enviar vuelve a Mis
 * borradores; al publicar, la versión 1 va a Mis borradores y las demás al detalle de la técnica, y los
 * dos con su aviso. Si la API rechaza, avisa el interceptor y la tarjeta se queda como estaba. Una versión
 * en revisión se ve en solo lectura: dice que no se puede editar y no tiene botón.
 */
@Component({
  selector: 'app-review-step',
  imports: [Button, ProgressMark, RouterLink],
  templateUrl: './review-step.html',
  styleUrl: './review-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewStep {
  readonly version = input.required<VersionSummary>();
  /** Revisor y admin publican lo suyo sin revisión. */
  readonly publishes = input.required<boolean>();
  /** El rol de quien edita, para el subtítulo de quien publica. */
  readonly role = input<Role | null>(null);

  private readonly state = inject(EditorState);
  private readonly versions = inject(VersionsRepository);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  private readonly confirmButton = viewChild('confirmButton', {
    read: ElementRef<HTMLButtonElement>,
  });
  private readonly sendButton = viewChild('sendButton', { read: ElementRef<HTMLButtonElement> });

  protected readonly editable = this.state.editable;
  protected readonly sections = computed(() => {
    const content = this.state.content();
    return content ? reviewSections(versionProgress(content)) : [];
  });
  protected readonly reason = computed(() => blockReason(this.sections(), this.publishes()));

  protected readonly title = computed(() =>
    this.publishes() ? 'Revisar y publicar' : 'Revisar y enviar',
  );
  protected readonly subtitle = computed(() => {
    if (!this.publishes()) return 'Un revisor la aprueba antes de publicarla.';
    return `Con rol ${this.role() === 'admin' ? 'admin' : 'revisor'}, lo propio se publica sin pasar por otro revisor.`;
  });
  protected readonly buttonLabel = computed(() => {
    if (!this.publishes()) return this.busy() ? 'Enviando…' : 'Enviar a revisión';
    return `${this.busy() ? 'Publicando' : 'Publicar'} versión ${this.version().number}${this.busy() ? '…' : ''}`;
  });
  /** La aclaración bajo el botón. La versión 1 de una técnica nueva no reemplaza nada. */
  protected readonly note = computed(() => {
    if (!this.publishes()) {
      return 'Mientras esté en revisión no se puede editar; si el revisor la devuelve, vuelve a Mis borradores con su comentario.';
    }
    const number = this.version().number;
    return number > 1
      ? `La versión ${number - 1} queda como reemplazada y se conserva en el historial.`
      : null;
  });
  /** Publicar la versión 1 mete la técnica al catálogo; las demás reemplazan a la publicada. */
  protected readonly isFirst = computed(() => this.version().number === 1);

  protected readonly confirming = signal(false);
  protected readonly busy = signal(false);

  /** Mandar a revisión va directo; publicar abre antes la confirmación en la misma tarjeta. */
  protected start(): void {
    if (this.busy() || this.reason() !== null || !this.editable()) return;
    if (!this.publishes()) {
      void this.send();
      return;
    }
    this.confirming.set(true);
    afterNextRender(() => this.confirmButton()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  protected cancel(): void {
    if (this.busy()) return;
    this.confirming.set(false);
    afterNextRender(() => this.sendButton()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Espera el guardado pendiente y manda la versión; un segundo toque mientras va el primero no hace nada. */
  protected async send(): Promise<void> {
    if (this.busy() || this.reason() !== null || !this.editable()) return;
    this.busy.set(true);
    // Si el guardado falla, el editor ya lo dice («No se pudo guardar.» con «Reintentar»)
    if (!(await this.state.whenSaved())) {
      this.busy.set(false);
      return;
    }
    const { id, technique, technique_id, number } = this.version();
    const publishing = this.publishes();
    (publishing ? this.versions.publish(id) : this.versions.submit(id)).subscribe({
      next: () => {
        this.state.abandon();
        this.notices.show('confirmation', [publishing ? publishedNotice(technique) : SUBMITTED]);
        void this.router.navigate(
          publishing && number > 1
            ? ['/tecnicas', technique_id, 'datos-clinicos']
            : ['/gestion/borradores'],
        );
      },
      // El interceptor ya avisó: la tarjeta se queda para intentarlo de nuevo
      error: () => {
        this.busy.set(false);
        this.confirming.set(false);
      },
    });
  }
}

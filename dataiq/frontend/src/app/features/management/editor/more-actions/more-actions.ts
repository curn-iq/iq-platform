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
import { Router } from '@angular/router';
import { NoticeService } from '../../../../core/notice/notice.service';
import { VersionsRepository } from '../../../../data/versions.repository';
import { canDiscard, discardDeletesTechnique } from '../../../../domain/discard-draft';
import type { VersionState } from '../../../../domain/version-state';
import { Button } from '../../../../shared/ui/button/button';
import { EditorState } from '../editor-state';

/** Lo que de la versión hace falta para descartarla. */
export interface DiscardableVersion {
  id: string;
  technique: string;
  number: number;
  state: VersionState;
}

/** Lo que dice el aviso al descartar. */
export const DISCARDED = 'Borrador descartado.';

/**
 * «Más acciones» del editor: tres puntos que abren un panel de 320 px como el de Mi cuenta (ver
 * «Mis borradores (página)» y «Detalle de técnica (página)» en `DESIGN.md`), con «Descartar
 * borrador» (Resuelto 25 de `dataiq/docs/checklist-frontend.md`). Descartar pide confirmación en el
 * mismo panel, como Archivar en el detalle: dice que no se puede recuperar y, si es la versión 1 de
 * una técnica que nunca se publicó, que también se borra la técnica. Solo se descarta un borrador:
 * en revisión la opción queda atenuada.
 *
 * Al descartar (`DELETE /versions/{id}`) va a Mis borradores y avisa «Borrador descartado.». Si la
 * API lo rechaza, el interceptor avisa y el panel se queda como estaba. Se cierra con Escape (el
 * foco vuelve al botón) y con un clic fuera.
 */
@Component({
  selector: 'app-more-actions',
  imports: [Button],
  templateUrl: './more-actions.html',
  styleUrl: './more-actions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeOnOutsideClick($event)',
    '(document:keydown.escape)': 'closeOnEscape()',
  },
})
export class MoreActions {
  readonly version = input.required<DiscardableVersion>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly notices = inject(NoticeService);
  private readonly versions = inject(VersionsRepository);
  // La versión que se descarta ya no existe: el autoguardado no debe mandarle nada más
  private readonly editorState = inject(EditorState, { optional: true });
  private readonly trigger = viewChild.required('trigger', { read: ElementRef<HTMLButtonElement> });
  private readonly confirmButton = viewChild('confirmButton', {
    read: ElementRef<HTMLButtonElement>,
  });

  protected readonly open = signal(false);
  protected readonly confirming = signal(false);
  protected readonly discarding = signal(false);

  protected readonly discardable = computed(() => canDiscard(this.version().state));
  protected readonly deletesTechnique = computed(() => discardDeletesTechnique(this.version()));

  protected toggle(): void {
    if (this.open()) this.close();
    else this.open.set(true);
  }

  /** Pasa de la lista de acciones a la confirmación; con la opción atenuada no hace nada. */
  protected askToDiscard(): void {
    if (!this.discardable()) return;
    this.confirming.set(true);
    // El foco va al botón de confirmar, que aparece con este cambio
    afterNextRender(() => this.confirmButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected cancel(): void {
    this.close();
    this.trigger().nativeElement.focus();
  }

  /** Descarta el borrador y vuelve a Mis borradores. Un segundo toque mientras va el primero no hace nada. */
  protected discard(): void {
    if (this.discarding() || !this.discardable()) return;
    this.discarding.set(true);
    this.versions.discard(this.version().id).subscribe({
      next: () => {
        this.editorState?.abandon();
        this.notices.show('confirmation', [DISCARDED]);
        void this.router.navigate(['/gestion/borradores']);
      },
      // El interceptor ya avisó: el panel se queda para intentarlo de nuevo o cancelar
      error: () => this.discarding.set(false),
    });
  }

  protected closeOnOutsideClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  protected closeOnEscape(): void {
    if (!this.open()) return;
    this.close();
    this.trigger().nativeElement.focus();
  }

  private close(): void {
    this.open.set(false);
    this.confirming.set(false);
  }
}

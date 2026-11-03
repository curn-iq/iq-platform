import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { SessionService } from '../../../core/session/session.service';
import { TechniquesRepository } from '../../../data/techniques.repository';
import { canArchive, hasVersionInProgress } from '../../../domain/archive-technique';
import { Button } from '../../../shared/ui/button/button';
import { TechniqueInProgress } from '../technique-in-progress';

/**
 * «Más acciones» del detalle de una técnica: tres puntos que abren un panel de 320 px como el de Mi
 * cuenta (ver «Detalle de técnica (página)» en `DESIGN.md`), con «Archivar técnica» (Resuelto 21 de
 * `dataiq/docs/checklist-frontend.md`). Solo lo ve un revisor o un admin. Archivar pide confirmación
 * en el mismo panel, que dice qué deja de verse y que las versiones quedan en el historial.
 *
 * Con una versión en curso no se puede archivar: la opción queda atenuada, con su motivo, y sigue
 * siendo enfocable (`aria-disabled`) para que se lea con teclado. Si la lista de versiones en curso no
 * llega, la opción queda disponible y el 409 de la API la respalda: el interceptor avisa su texto y la
 * opción pasa a atenuada. Al archivar (`POST /techniques/{id}/archive`) avisa con `archived`, que es
 * lo que muestra el aviso del detalle. Se cierra con Escape (el foco vuelve al botón) y con un clic
 * fuera.
 */
@Component({
  selector: 'app-technique-more-actions',
  imports: [Button],
  templateUrl: './technique-more-actions.html',
  styleUrl: './technique-more-actions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeOnOutsideClick($event)',
    '(document:keydown.escape)': 'closeOnEscape()',
  },
})
export class TechniqueMoreActions {
  readonly techniqueId = input.required<string>();
  /** El nombre que dice la confirmación. */
  readonly techniqueName = input.required<string>();
  /** La técnica quedó archivada. */
  readonly archived = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly session = inject(SessionService);
  private readonly techniques = inject(TechniquesRepository);
  private readonly inProgress = inject(TechniqueInProgress);
  private readonly trigger = viewChild('trigger', { read: ElementRef<HTMLButtonElement> });
  private readonly confirmButton = viewChild('confirmButton', {
    read: ElementRef<HTMLButtonElement>,
  });

  protected readonly open = signal(false);
  protected readonly confirming = signal(false);
  protected readonly archiving = signal(false);
  /** La técnica de la que la API respondió 409: tiene una versión en curso que no se conocía. */
  private readonly conflictFor = signal<string | null>(null);

  /** Solo un revisor o un admin ve «Más acciones». */
  protected readonly visible = computed(() => canArchive(this.session.role()));

  /** Hay una versión en curso (la lista la trae, o la API lo dijo con un 409): no se puede archivar. */
  protected readonly blocked = computed(() => {
    const id = this.techniqueId();
    return this.conflictFor() === id || hasVersionInProgress(this.inProgress.versions(), id);
  });

  constructor() {
    // El componente se reutiliza al cambiar de técnica: lo abierto de una no vale para otra
    effect(() => {
      this.techniqueId();
      untracked(() => this.close());
    });
  }

  protected toggle(): void {
    if (this.open()) this.close();
    else this.open.set(true);
  }

  /** Pasa de la lista de acciones a la confirmación; con la opción atenuada no hace nada. */
  protected askToArchive(): void {
    if (this.blocked()) return;
    this.confirming.set(true);
    // El foco va al botón de confirmar, que aparece con este cambio
    afterNextRender(() => this.confirmButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected cancel(): void {
    this.close();
    this.trigger()?.nativeElement.focus();
  }

  /** Archiva la técnica. Un segundo toque mientras va el primero no hace nada. */
  protected archive(): void {
    if (this.archiving() || this.blocked()) return;
    const id = this.techniqueId();
    this.archiving.set(true);
    this.techniques.archive(id).subscribe({
      next: () => {
        this.archiving.set(false);
        this.close();
        this.archived.emit();
      },
      error: (error: unknown) => {
        this.archiving.set(false);
        // El interceptor ya avisó el motivo. Un 409 es una versión en curso: la opción queda atenuada
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.conflictFor.set(id);
          this.confirming.set(false);
        }
      },
    });
  }

  protected closeOnOutsideClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  protected closeOnEscape(): void {
    if (!this.open()) return;
    this.close();
    this.trigger()?.nativeElement.focus();
  }

  private close(): void {
    this.open.set(false);
    this.confirming.set(false);
  }
}

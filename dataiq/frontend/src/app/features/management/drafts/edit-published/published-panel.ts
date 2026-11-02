import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { describeApiError } from '../../../../core/http/error-message';
import { SessionService } from '../../../../core/session/session.service';
import { TechniquesRepository } from '../../../../data/techniques.repository';
import { VersionsRepository } from '../../../../data/versions.repository';
import { inProgressText } from '../../../../domain/edit-published';
import { FIRST_EDITOR_STEP } from '../../../../domain/editor-steps';
import { groupBySpecialty } from '../../../../domain/technique-groups';
import { filterGroups, highlight } from '../../../../domain/technique-search';
import { Button } from '../../../../shared/ui/button/button';
import { SearchField } from '../../../../shared/ui/search-field/search-field';

/**
 * El panel de «Editar una publicada» (ver «Mis borradores (página)» en `DESIGN.md`): las técnicas
 * publicadas agrupadas por especialidad, con un buscador sin tildes. Las que ya tienen una versión
 * en curso salen atenuadas, porque cada técnica tiene una sola: «Ya está en curso» si es de quien
 * pregunta y «En curso por …» si es de otra persona. Elegir una crea la versión nueva
 * (`POST /techniques/{id}/versions`) y lleva a ella.
 *
 * Un colaborador solo ve sus propias versiones en curso (Resuelto 24): la de otra persona se la
 * dice el 409 al elegir la técnica, bajo su fila, que desde entonces queda atenuada.
 *
 * Se crea al abrirlo, así que pide las técnicas, las especialidades y las versiones en curso solo
 * entonces.
 */
@Component({
  selector: 'app-published-panel',
  imports: [Button, SearchField],
  templateUrl: './published-panel.html',
  styleUrl: './published-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'dialog', 'aria-label': 'Editar una técnica publicada' },
})
export class PublishedPanel {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly techniques = inject(TechniquesRepository);
  private readonly publishedResource = this.techniques.list();
  private readonly specialtiesResource = this.techniques.specialties();
  private readonly inProgressResource = inject(VersionsRepository).list();

  protected readonly query = signal('');
  /** La técnica cuya versión se está creando. */
  protected readonly creating = signal<string | null>(null);
  /** Lo que dijo la API (409) de las técnicas que resultaron tener una versión en curso. */
  private readonly conflicts = signal<Readonly<Record<string, string>>>({});

  protected readonly loaded = computed(
    () =>
      this.publishedResource.hasValue() &&
      this.specialtiesResource.hasValue() &&
      this.inProgressResource.hasValue() &&
      this.session.account() !== null,
  );
  /** Algo no llegó por un error (el interceptor ya avisó): no se sabe qué técnicas hay. */
  protected readonly failed = computed(
    () =>
      !this.loaded() &&
      !this.publishedResource.isLoading() &&
      !this.specialtiesResource.isLoading() &&
      !this.inProgressResource.isLoading() &&
      (this.publishedResource.error() !== undefined ||
        this.specialtiesResource.error() !== undefined ||
        this.inProgressResource.error() !== undefined),
  );

  /** Lo que dice cada técnica con una versión en curso, por el `id` de la técnica. */
  private readonly busyTexts = computed(() => {
    const accountId = this.session.account()?.id;
    const texts = new Map<string, string>();
    // Sin la cuenta no se sabe cuáles son de quien mira (`loaded` la espera)
    if (accountId === undefined) return texts;
    for (const version of this.inProgressResource.value() ?? []) {
      texts.set(version.technique_id, inProgressText(version, accountId));
    }
    return texts;
  });

  protected readonly groups = computed(() => {
    const grouped = groupBySpecialty(
      (this.specialtiesResource.value() ?? []).map((specialty) => specialty.name),
      this.publishedResource.value() ?? [],
    );
    const query = this.query();
    return filterGroups(grouped, { specialty: null, query }).map((group) => ({
      specialty: group.specialty,
      techniques: group.techniques.map((technique) => ({
        id: technique.id,
        name: technique.name,
        segments: highlight(technique.name, query),
        busy: this.conflicts()[technique.id] ?? this.busyTexts().get(technique.id) ?? null,
        conflict: technique.id in this.conflicts(),
      })),
    }));
  });

  constructor() {
    // Abre con el cursor en el buscador
    afterNextRender(() => this.host.nativeElement.querySelector('input')?.focus());
  }

  protected retry(): void {
    if (this.publishedResource.error() !== undefined) this.publishedResource.reload();
    if (this.specialtiesResource.error() !== undefined) this.specialtiesResource.reload();
    if (this.inProgressResource.error() !== undefined) this.inProgressResource.reload();
  }

  /** Crea la versión nueva de la técnica y lleva a ella. Un segundo toque mientras va el primero no hace nada. */
  protected choose(techniqueId: string): void {
    if (this.creating() !== null) return;
    this.creating.set(techniqueId);
    this.techniques.createVersion(techniqueId).subscribe({
      next: (version) =>
        void this.router.navigate(['/gestion/editor', version.summary.id, FIRST_EDITOR_STEP]),
      error: (error: unknown) => {
        this.creating.set(null);
        // El interceptor no avisa el 409: lo dice la fila. Los demás errores ya los avisó él.
        if (error instanceof HttpErrorResponse && error.status === 409) {
          const message = describeApiError(409, error.error)?.join(' ') ?? '';
          this.conflicts.update((conflicts) => ({ ...conflicts, [techniqueId]: message }));
        }
      },
    });
  }
}

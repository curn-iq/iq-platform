import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TechniqueSummary } from '../../../data/api/models';
import { TechniquesRepository } from '../../../data/techniques.repository';
import { groupBySpecialty } from '../../../domain/technique-groups';
import { filterGroups } from '../../../domain/technique-search';
import { SearchField } from '../../../shared/ui/search-field/search-field';

/**
 * La columna de técnicas del detalle (`tecnica.html`, «Detalle de técnica» en
 * `DESIGN.md`): buscador y todas las técnicas agrupadas por especialidad, con la
 * actual marcada. Elegir otra navega sin salir de la página y conserva la pestaña
 * abierta, para comparar la misma hoja entre técnicas. En celular se pliega en un
 * selector que dice la especialidad y la técnica de la página.
 */
@Component({
  selector: 'app-technique-column',
  imports: [RouterLink, SearchField],
  templateUrl: './technique-column.html',
  styleUrl: './technique-column.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueColumn {
  /** El `id` de la técnica abierta; no hay ninguno si la URL no es de una técnica. */
  readonly currentId = input<string>();
  /** El slug de la pestaña abierta, que conservan los enlaces. */
  readonly tab = input.required<string>();

  private readonly repository = inject(TechniquesRepository);
  private readonly techniquesResource = this.repository.list();
  private readonly specialtiesResource = this.repository.specialties();

  private readonly techniques = computed<readonly TechniqueSummary[]>(() =>
    this.techniquesResource.hasValue() ? (this.techniquesResource.value() ?? []) : [],
  );
  private readonly specialtyNames = computed(() =>
    this.specialtiesResource.hasValue()
      ? (this.specialtiesResource.value() ?? []).map((s) => s.name)
      : [],
  );

  protected readonly query = signal('');
  /** El selector de celular está desplegado. */
  protected readonly open = signal(false);

  private readonly grouped = computed(() =>
    groupBySpecialty(this.specialtyNames(), this.techniques()),
  );
  protected readonly groups = computed(() =>
    filterGroups(this.grouped(), { specialty: null, query: this.query() }),
  );

  /** Las dos listas llegaron: antes de eso, «ninguna coincide» sería mentira. */
  protected readonly loaded = computed(
    () => this.techniquesResource.hasValue() && this.specialtiesResource.hasValue(),
  );
  protected readonly loading = computed(
    () => this.techniquesResource.isLoading() || this.specialtiesResource.isLoading(),
  );

  protected readonly emptyTitle = computed(
    () => `Ninguna técnica coincide con «${this.query().trim()}».`,
  );

  /** Lo que dice el selector de celular: «Cirugía general · Tiroidectomía». */
  protected readonly currentLabel = computed(() => {
    const current = this.techniques().find((technique) => technique.id === this.currentId());
    return current ? `${current.specialty} · ${current.name}` : 'Técnicas';
  });
}

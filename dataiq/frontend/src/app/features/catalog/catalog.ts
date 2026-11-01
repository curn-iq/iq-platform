import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { TechniqueSummary } from '../../data/api/models';
import { TechniquesRepository } from '../../data/techniques.repository';
import { groupBySpecialty } from '../../domain/technique-groups';
import { filterGroups, highlight } from '../../domain/technique-search';
import { REDUCED_MOTION_QUERY, mediaQuery } from '../../shared/media-query';
import { Button } from '../../shared/ui/button/button';
import { SearchField } from '../../shared/ui/search-field/search-field';

/** El parámetro de la URL con el `id` de la especialidad elegida: `/tecnicas?especialidad=`. */
const SPECIALTY_PARAM = 'especialidad';

const EASING = 'cubic-bezier(.16, 1, .3, 1)';

/**
 * El catálogo de técnicas (`/tecnicas`, `catalogo.html`): a la izquierda, el filtro
 * de especialidades («Todas» y las de la API) con una placa que se desliza a la
 * elegida; a la derecha, el buscador y la lista de técnicas agrupada por
 * especialidad. El buscador no distingue tildes ni mayúsculas, resalta lo que
 * coincide y también encuentra una especialidad por su nombre. Al buscar o filtrar,
 * las filas que siguen a la vista se deslizan a su sitio (FLIP). Cada técnica
 * lleva a su detalle. En celular el filtro pasa a una fila de chips.
 *
 * La especialidad elegida vive en la URL (`?especialidad=<id>`), así que la barra y
 * el pie llegan al catálogo ya filtrado y el filtro se puede compartir.
 */
@Component({
  selector: 'app-catalog',
  imports: [Button, NgTemplateOutlet, RouterLink, SearchField],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly reduced = mediaQuery(REDUCED_MOTION_QUERY);

  private readonly repository = inject(TechniquesRepository);
  private readonly techniquesResource = this.repository.list();
  private readonly specialtiesResource = this.repository.specialties();

  protected readonly specialties = computed(() =>
    this.specialtiesResource.hasValue() ? (this.specialtiesResource.value() ?? []) : [],
  );
  private readonly techniques = computed<readonly TechniqueSummary[]>(() =>
    this.techniquesResource.hasValue() ? (this.techniquesResource.value() ?? []) : [],
  );

  /** Las dos listas llegaron: antes de eso, «no hay técnicas» sería mentira. */
  protected readonly loaded = computed(
    () => this.techniquesResource.hasValue() && this.specialtiesResource.hasValue(),
  );
  protected readonly loading = computed(
    () => this.techniquesResource.isLoading() || this.specialtiesResource.isLoading(),
  );

  // ---------- Lo que elige la persona ----------

  private readonly urlSpecialty = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get(SPECIALTY_PARAM))),
    { initialValue: null },
  );

  /**
   * El `id` de la especialidad elegida, o `null` para todas. Parte de la URL y la
   * sigue cuando cambia (la barra, el pie, Atrás); al elegir otra se pone aquí al
   * momento y la URL la alcanza.
   */
  protected readonly selectedId = linkedSignal(() => this.urlSpecialty());
  protected readonly query = signal('');

  /** El nombre de la especialidad elegida; un `id` que no existe es como no haber elegido. */
  private readonly selectedName = computed(
    () => this.specialties().find((s) => s.id === this.selectedId())?.name ?? null,
  );
  /** Qué fila del filtro está elegida: 0 es «Todas». */
  protected readonly selectedIndex = computed(() => {
    const index = this.specialties().findIndex((s) => s.id === this.selectedId());
    return index + 1;
  });

  protected readonly groups = computed(() => {
    const grouped = groupBySpecialty(
      this.specialties().map((s) => s.name),
      this.techniques(),
    );
    return (
      filterGroups(grouped, { specialty: this.selectedName(), query: this.query() })
        // Cada técnica con su nombre ya partido en lo que coincide con la búsqueda
        .map((group) => ({
          specialty: group.specialty,
          techniques: group.techniques.map((technique) => ({
            id: technique.id,
            segments: highlight(technique.name, this.query()),
          })),
        }))
    );
  });

  /** El título del estado vacío: nombra la búsqueda si la hay. */
  protected readonly emptyTitle = computed(() => {
    const query = this.query().trim();
    return query
      ? `Ninguna técnica coincide con «${query}».`
      : 'No hay técnicas en esta especialidad.';
  });

  // ---------- La placa del filtro ----------

  private readonly filterButtons = viewChildren<ElementRef<HTMLButtonElement>>('filterButton');
  private readonly filter = viewChild<ElementRef<HTMLElement>>('filter');
  protected readonly plateTop = signal(0);
  protected readonly plateHeight = signal(0);
  /** La placa no se anima hasta que se colocó por primera vez. */
  protected readonly plateReady = signal(false);

  private readonly rows = viewChildren<ElementRef<HTMLElement>>('row');

  constructor() {
    afterRenderEffect(() => {
      // Se vuelve a colocar al elegir otra especialidad o cuando llegan las de la API
      this.selectedIndex();
      this.specialties();
      this.placePlate();
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onResize = () => this.placePlate();
      window.addEventListener('resize', onResize);
      destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
      // El ancho de las filas cambia cuando carga la fuente
      void document.fonts?.ready.then(onResize);
      requestAnimationFrame(() => this.plateReady.set(true));
    });
  }

  /** Coloca la placa tras la fila elegida del filtro. */
  private placePlate(): void {
    const button = this.filterButtons()[this.selectedIndex()]?.nativeElement;
    if (!button) return;
    const item = button.parentElement!;
    this.plateTop.set(item.offsetTop);
    this.plateHeight.set(button.offsetHeight);
  }

  // ---------- Acciones ----------

  protected chooseSpecialty(id: string | null): void {
    this.flip(() => this.selectedId.set(id));
    // La URL refleja lo elegido sin sumar una entrada al historial por cada clic
    void this.router.navigate([], {
      queryParams: { [SPECIALTY_PARAM]: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.revealChip(id);
  }

  protected search(query: string): void {
    this.flip(() => this.query.set(query));
  }

  /** «Ver todas las técnicas» del estado vacío: sin búsqueda y sin especialidad. */
  protected showAll(): void {
    this.flip(() => this.query.set(''));
    this.chooseSpecialty(null);
  }

  /** En celular, el chip elegido entra a la vista de la fila. */
  private revealChip(id: string | null): void {
    const nav = this.filter()?.nativeElement;
    if (!nav || nav.scrollWidth <= nav.clientWidth || typeof nav.scrollTo !== 'function') return;
    const index = id === null ? 0 : this.specialties().findIndex((s) => s.id === id) + 1;
    const chip = this.filterButtons()[index]?.nativeElement;
    if (chip)
      nav.scrollTo({ left: chip.offsetLeft - 16, behavior: this.reduced() ? 'auto' : 'smooth' });
  }

  /**
   * FLIP: recuerda dónde está cada fila, aplica el cambio y, ya dibujado, desliza
   * cada fila que sigue a la vista desde donde estaba; las nuevas entran subiendo.
   * Con movimiento reducido, solo el cambio.
   */
  private flip(change: () => void): void {
    if (this.reduced()) {
      change();
      return;
    }
    const before = new Map<string, number>();
    for (const row of this.rows()) {
      before.set(row.nativeElement.dataset['id']!, row.nativeElement.getBoundingClientRect().top);
    }
    change();
    afterNextRender(
      () => {
        for (const { nativeElement: row } of this.rows()) {
          if (typeof row.animate !== 'function') continue;
          const was = before.get(row.dataset['id']!);
          if (was === undefined) {
            row.animate(
              [
                { opacity: 0, transform: 'translateY(10px)' },
                { opacity: 1, transform: 'none' },
              ],
              { duration: 420, easing: EASING },
            );
          } else {
            const delta = was - row.getBoundingClientRect().top;
            if (Math.abs(delta) > 1) {
              row.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
                duration: 520,
                easing: EASING,
              });
            }
          }
        }
      },
      { injector: this.injector },
    );
  }
}

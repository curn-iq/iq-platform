import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of, switchMap, type Observable } from 'rxjs';
import { NoticeService } from '../../../core/notice/notice.service';
import { APP_NAME } from '../../../core/title/page-title.strategy';
import type { FullCatalog, Instrument } from '../../../data/api/models';
import { CatalogRepository } from '../../../data/catalog.repository';
import { toTables } from '../../../data/tables';
import {
  firstInstrumentId,
  indexGroups,
  placementIndex,
  savedNotice,
  techniqueCount,
  toCreate,
  toUpdate,
  type CatalogEntry,
  type EntryDraft,
  type TechniqueUse,
} from '../../../domain/instrument-catalog';
import { isUuid } from '../../../domain/uuid';
import { Button } from '../../../shared/ui/button/button';
import { NotFound } from '../../../shared/ui/not-found/not-found';
import { InstrumentEntry, type EntryMode } from './instrument-entry/instrument-entry';
import { InstrumentIndex } from './instrument-index/instrument-index';

/**
 * El catálogo de instrumental (`/gestion/instrumental/:id?`, `instrumental.html`, Resuelto 62 de
 * `dataiq/docs/checklist-frontend.md`): a la izquierda el índice por categoría con su buscador, y a la
 * derecha la entrada del instrumento elegido, que se lee, se edita en su sitio o se escribe nueva. Todo sale
 * de `GET /catalog/full`: los instrumentos con sus alias, las categorías, y las técnicas publicadas con sus
 * mesas, de donde se calcula «Dónde va» (Resuelto 19). Sin instrumento en la URL se abre el primero del
 * índice. El instrumento va en la URL; el modo de edición no: elegir otro instrumento descarta lo escrito.
 *
 * Al crear o editar (`POST` y `PATCH /instruments`) el cambio se ve de una vez, sin esperar a que el
 * catálogo se vuelva a pedir (la API lo deja 5 minutos en la caché del navegador): se pide de nuevo
 * saltándose esa caché, y mientras llega se usa lo que respondió la API. Crear con alias son dos pasos
 * (`POST` no recibe alias): si fallan los alias, el instrumento queda creado y el interceptor avisa.
 */
@Component({
  selector: 'app-instruments',
  imports: [Button, InstrumentEntry, InstrumentIndex, NotFound],
  templateUrl: './instruments.html',
  styleUrl: './instruments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Instruments {
  private readonly repository = inject(CatalogRepository);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  // ---------- El catálogo ----------

  private readonly cache = signal<RequestCache>('default');
  private readonly resource = this.repository.full(() => this.cache());
  /** Lo que respondió la API al guardar, hasta que el catálogo vuelto a pedir lo trae. */
  private readonly saved = signal<ReadonlyMap<string, Instrument>>(new Map());

  /** El último catálogo que llegó: mientras se vuelve a pedir tras guardar, la pantalla sigue con él. */
  private readonly catalog = linkedSignal<FullCatalog | undefined, FullCatalog | undefined>({
    source: () => (this.resource.hasValue() ? this.resource.value() : undefined),
    computation: (current, previous) => current ?? previous?.value,
  });
  protected readonly loaded = computed(() => this.catalog() !== undefined);
  protected readonly failed = computed(
    () => !this.loaded() && !this.resource.isLoading() && this.resource.error() !== undefined,
  );

  protected readonly categories = computed(() => this.catalog()?.categories ?? []);
  protected readonly specialties = computed(() =>
    (this.catalog()?.specialties ?? []).map((s) => s.name),
  );

  /** Los instrumentos, con lo recién guardado por encima de lo que trajo el catálogo. */
  protected readonly instruments = computed<readonly CatalogEntry[]>(() => {
    const catalog = this.catalog();
    if (!catalog) return [];
    const saved = this.saved();
    const known = new Set(catalog.instruments.map((instrument) => instrument.id));
    return [
      ...catalog.instruments.map((instrument) => saved.get(instrument.id) ?? instrument),
      ...[...saved.values()].filter((instrument) => !known.has(instrument.id)),
    ];
  });

  private readonly techniques = computed<TechniqueUse[]>(() =>
    (this.catalog()?.techniques ?? []).map((technique) => ({
      id: technique.id,
      name: technique.name,
      specialty: technique.specialty,
      items: technique.items,
      tables: toTables(technique.zones, technique.items),
    })),
  );
  private readonly placements = computed(() => placementIndex(this.techniques()));

  private techniquesOf = (id: string): number => techniqueCount(this.placements().get(id) ?? []);

  // ---------- El índice ----------

  protected readonly query = signal('');
  protected readonly groups = computed(() =>
    indexGroups(this.instruments(), this.techniquesOf, this.query()),
  );

  // ---------- La entrada ----------

  /** El `id` de la URL, si es uno posible; `null` si no hay. */
  private readonly routeId = computed(() => this.params().get('id'));
  protected readonly invalidId = computed(() => {
    const id = this.routeId();
    return id !== null && !isUuid(id);
  });

  /** El instrumento abierto: el de la URL o, sin ninguno, el primero del índice. */
  protected readonly entry = computed<CatalogEntry | undefined>(() => {
    const id = this.routeId();
    const wanted =
      id === null ? firstInstrumentId(indexGroups(this.instruments(), this.techniquesOf, '')) : id;
    return this.instruments().find((instrument) => instrument.id === wanted);
  });
  /** La URL pide un instrumento que no existe. */
  protected readonly notFound = computed(
    () => this.invalidId() || (this.loaded() && this.routeId() !== null && !this.entry()),
  );

  protected readonly entryPlacements = computed(() => {
    const entry = this.entry();
    return entry && this.mode() !== 'new' ? (this.placements().get(entry.id) ?? []) : [];
  });

  protected readonly mode = signal<EntryMode>('read');
  protected readonly saving = signal(false);

  /** El instrumento marcado en el índice; ninguno mientras se escribe uno nuevo. */
  protected readonly selectedId = computed(() =>
    this.mode() === 'new' ? null : (this.entry()?.id ?? null),
  );

  /** Lo que dice el selector de celular: «Pinza · Pinza Kelly». */
  protected readonly indexLabel = computed(() => {
    if (this.mode() === 'new') return 'Nuevo instrumento';
    const entry = this.entry();
    return entry ? `${entry.category} · ${entry.name}` : 'Instrumental';
  });

  constructor() {
    // Elegir otro instrumento descarta lo que se estaba escribiendo
    effect(() => {
      this.routeId();
      untracked(() => this.mode.set('read'));
    });
    effect(() => {
      const name = this.mode() === 'new' ? 'Nuevo instrumento' : this.entry()?.name;
      if (name) this.title.setTitle(`${name} · Instrumental · ${APP_NAME}`);
    });
    // Cuando llega el catálogo vuelto a pedir, ya trae lo guardado
    effect(() => {
      this.catalog();
      untracked(() => this.saved.set(new Map()));
    });
  }

  protected backToReading(): void {
    this.mode.set('read');
  }

  protected retry(): void {
    this.resource.reload();
  }

  // ---------- Guardar ----------

  protected save(draft: EntryDraft): void {
    if (this.saving()) return;
    const isNew = this.mode() === 'new';
    const entry = this.entry();
    if (isNew) {
      this.run(this.create(draft), true, 0);
      return;
    }
    if (!entry) return;
    const changes = toUpdate(entry, draft, this.categories());
    if (Object.keys(changes).length === 0) {
      this.mode.set('read');
      return;
    }
    this.run(
      this.repository.updateInstrument(entry.id, changes),
      false,
      techniqueCount(this.placements().get(entry.id) ?? []),
    );
  }

  /** Crea el instrumento y, si trae alias, se los pone: el `POST` no los recibe. */
  private create(draft: EntryDraft): Observable<Instrument> {
    return this.repository.createInstrument(toCreate(draft)).pipe(
      switchMap((created) =>
        draft.aliases.length === 0
          ? of(created)
          : this.repository
              .updateInstrument(created.id, { aliases: [...draft.aliases] })
              // Ya existe: si fallan los alias, el interceptor avisa y el instrumento queda sin ellos
              .pipe(catchError(() => of(created))),
      ),
    );
  }

  private run(request: Observable<Instrument>, isNew: boolean, techniques: number): void {
    this.saving.set(true);
    request.subscribe({
      next: (instrument) => {
        this.saving.set(false);
        this.saved.update((current) => new Map(current).set(instrument.id, instrument));
        this.cache.set('reload');
        this.notices.show('confirmation', [savedNotice(isNew, techniques)]);
        this.mode.set('read');
        if (isNew) void this.router.navigate(['/gestion/instrumental', instrument.id]);
      },
      // El interceptor ya avisó: lo escrito se queda para corregirlo
      error: () => this.saving.set(false),
    });
  }
}

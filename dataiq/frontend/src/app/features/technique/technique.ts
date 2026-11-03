import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { SessionService } from '../../core/session/session.service';
import { APP_NAME } from '../../core/title/page-title.strategy';
import { isZoneOmitted, toTables } from '../../data/tables';
import { TechniquesRepository } from '../../data/techniques.repository';
import { SIVRI_URL, simiq3dTechniqueUrl } from '../../domain/module-links';
import { findTechniqueTab, TECHNIQUE_TABS } from '../../domain/technique-tabs';
import { isUuid } from '../../domain/uuid';
import { Button } from '../../shared/ui/button/button';
import { NotFound } from '../../shared/ui/not-found/not-found';
import { TabItem, Tabs } from '../../shared/ui/tabs/tabs';
import { TechniqueClinical } from './technique-clinical/technique-clinical';
import { TechniqueColumn } from './technique-column/technique-column';
import { TechniqueEditAction } from './technique-edit-action/technique-edit-action';
import { GatePreview, TechniqueGate } from './technique-gate/technique-gate';
import { TechniqueInProgress } from './technique-in-progress';
import { TechniqueInstrumental } from './technique-instrumental/technique-instrumental';
import { TechniqueMoreActions } from './technique-more-actions/technique-more-actions';
import { TechniqueTable } from './technique-table/technique-table';

/**
 * Lo que dice la hoja de cada mesa: bajo su título (`hint`), si la técnica no la lleva
 * (`omitted`) y si no se sabe porque su arreglo no está en los datos (`missing`). No son
 * lo mismo: decir «Sin mesa» de lo segundo sería un dato falso (regla 1 de `CLAUDE.md`).
 */
const TABLE_TEXTS: Record<string, { hint: string; omitted: string; missing: string }> = {
  'mesa-de-mayo': {
    hint: 'Señala un número para ubicar su pieza.',
    omitted: 'Sin mesa de Mayo.',
    missing: 'Mesa de Mayo sin arreglo disponible.',
  },
  'mesa-de-reserva': {
    hint: 'Señala un número para ubicar su objeto.',
    omitted: 'Sin mesa de reserva.',
    missing: 'Mesa de reserva sin arreglo disponible.',
  },
};

/** Lo que dice la puerta de cuenta de cada pestaña que la lleva (sin prometer contenido). */
const GATE_TEXTS: Record<string, { preview: GatePreview; title: string; text: string }> = {
  instrumental: {
    preview: 'objects',
    title: 'Ver el instrumental completo',
    text: 'Con una cuenta gratuita se abre el instrumental de esta técnica.',
  },
  'mesa-de-mayo': {
    preview: 'table',
    title: 'Ver la mesa de Mayo',
    text: 'Con una cuenta gratuita se abre la mesa de Mayo de esta técnica.',
  },
  'mesa-de-reserva': {
    preview: 'table',
    title: 'Ver la mesa de reserva',
    text: 'Con una cuenta gratuita se abre la mesa de reserva de esta técnica.',
  },
};

/**
 * El detalle de una técnica (`/tecnicas/:id/:pestana`, `tecnica.html`): a la izquierda
 * la columna de técnicas y a la derecha el nombre de la técnica con su especialidad,
 * las pestañas y la hoja de la elegida. Una técnica que no existe, o una pestaña que
 * no es una de las cuatro, muestra «No encontrada». Si la API no responde, lo dice y
 * ofrece reintentar: no se queda cargando para siempre ni pasa por una hoja vacía.
 *
 * La pestaña vive en la URL, así que se puede compartir y Atrás la recuerda.
 * `/tecnicas/:id` redirige a los datos clínicos (ver `app.routes.ts`).
 */
@Component({
  selector: 'app-technique',
  imports: [
    Button,
    NotFound,
    RouterLink,
    Tabs,
    TechniqueClinical,
    TechniqueColumn,
    TechniqueEditAction,
    TechniqueGate,
    TechniqueInstrumental,
    TechniqueMoreActions,
    TechniqueTable,
  ],
  providers: [TechniqueInProgress],
  templateUrl: './technique.html',
  styleUrl: './technique.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueDetail {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly session = inject(SessionService);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  /** El `id` de la URL; un texto que no puede ser un id no se pide a la API. */
  protected readonly techniqueId = computed(() => {
    const id = this.params().get('id');
    return id !== null && isUuid(id) ? id : undefined;
  });
  protected readonly tab = computed(() => findTechniqueTab(this.params().get('pestana')));

  // Con una pestaña que no existe no hay técnica que pedir. Es un `computed` para que cambiar
  // de pestaña, que deja el mismo id, no vuelva a pedir la técnica.
  private readonly requestedId = computed(() => (this.tab() ? this.techniqueId() : undefined));
  private readonly repository = inject(TechniquesRepository);
  private readonly resource = this.repository.get(() => this.requestedId());

  // Lo que se usa en la mesa pide cuenta: sin sesión no se pide (la vista previa es de otra casilla).
  // Es un `computed`, así que pasar de una mesa a otra no vuelve a pedirlo.
  private readonly instrumentsId = computed(() =>
    this.tab()?.requiresAccount && this.session.isLoggedIn() ? this.requestedId() : undefined,
  );
  private readonly instruments = this.repository.instruments(() => this.instrumentsId());

  /** Los datos clínicos, cuando llegan. */
  protected readonly technique = computed(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  /** La API respondió 404, la URL no es de una técnica o la pestaña no existe. */
  protected readonly notFound = computed(() => {
    if (this.techniqueId() === undefined || this.tab() === undefined) return true;
    const error = this.resource.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  // Al reintentar, el recurso conserva el error hasta que llega la respuesta: mientras
  // tanto se muestra que está cargando, no que falló.

  /** La API no entregó la técnica por algo que no es un 404: no se sabe si existe. */
  protected readonly techniqueFailed = computed(
    () => !this.notFound() && !this.resource.isLoading() && this.resource.error() !== undefined,
  );

  /** Lo que pide la pestaña abierta no llegó, o no se sabe si hay sesión para pedirlo. */
  private readonly accountFailed = computed(
    () =>
      this.tab()?.requiresAccount === true &&
      (this.session.loadFailed() ||
        (!this.instruments.isLoading() && this.instruments.error() !== undefined)),
  );

  /** Algo de lo que muestra la hoja no llegó, y se ofrece reintentar. */
  protected readonly failed = computed(() => this.techniqueFailed() || this.accountFailed());

  /** Las mesas de la técnica, cuando llegan; `undefined` mientras no. */
  protected readonly instrumentsData = computed(() =>
    this.instruments.hasValue() ? this.instruments.value() : undefined,
  );

  private readonly tables = computed(() => {
    const data = this.instrumentsData();
    return data && toTables(data.zones, data.items);
  });

  /** La hoja de una mesa: lo que dice y su mesa. `undefined` si la pestaña no es de una mesa o aún no llegan. */
  protected readonly tableSheet = computed(() => {
    const tab = this.tab();
    const texts = tab && TABLE_TEXTS[tab.slug];
    const tables = this.tables();
    const zones = this.instrumentsData()?.zones;
    if (!tab?.zone || !texts || !tables || !zones) return undefined;
    return {
      title: tab.label,
      hint: texts.hint,
      empty: isZoneOmitted(zones, tab.zone) ? texts.omitted : texts.missing,
      table: tables.find((table) => table.name === tab.zone),
    };
  });

  /** Se está pidiendo lo que ve quien tiene cuenta, o aún no se sabe si hay sesión para pedirlo. */
  protected readonly accountLoading = computed(
    () =>
      this.tab()?.requiresAccount === true &&
      (this.instruments.isLoading() || (!this.session.loaded() && !this.session.loadFailed())),
  );

  /** Sin sesión, las pestañas que piden cuenta llevan un candado (solo cuando ya se sabe que no hay). */
  protected readonly locked = computed(() => this.session.loaded() && !this.session.isLoggedIn());

  /**
   * «Ver en 3D» y «Comprobar con la cámara», en toda técnica (si el módulo no cubre una, su propia
   * pantalla lo dice, Resuelto 17). Con sesión llevan al módulo, con navegación completa; sin ella,
   * a crear la cuenta, con la pestaña a la que volver. Hasta que se sabe si hay sesión no se
   * muestran, para no llevar a quien sí la tiene a la cuenta.
   */
  protected readonly actions = computed(() => {
    const id = this.techniqueId();
    const tab = this.tab();
    if (!id || !tab || !this.session.loaded()) return undefined;
    const module = this.session.isLoggedIn()
      ? { external: true as const }
      : { external: false as const, returnTo: `/tecnicas/${id}/${tab.slug}` };
    return {
      ...module,
      items: [
        {
          label: 'Ver en 3D',
          module: 'SIMIQ3D',
          variant: 'soft' as const,
          href: simiq3dTechniqueUrl(id),
        },
        {
          label: 'Comprobar con la cámara',
          module: 'SIVRI',
          variant: 'primary' as const,
          href: SIVRI_URL,
        },
      ],
    };
  });

  /**
   * La puerta de cuenta de la pestaña abierta: solo sin sesión y en las que piden cuenta. El
   * vistazo es el mismo en toda técnica, así que no revela si le falta una mesa.
   */
  protected readonly gate = computed(() => {
    const tab = this.tab();
    const id = this.techniqueId();
    const texts = tab && GATE_TEXTS[tab.slug];
    if (!this.locked() || !texts || !id) return undefined;
    return { ...texts, returnTo: `/tecnicas/${id}/${tab.slug}` };
  });

  protected readonly tabItems = computed<TabItem[]>(() =>
    TECHNIQUE_TABS.map((tab) => ({
      key: tab.slug,
      label: tab.label,
      link: ['/tecnicas', this.techniqueId(), tab.slug],
      locked: this.locked() && tab.requiresAccount,
    })),
  );

  // El router pone el título genérico de la ruta al navegar, justo antes de
  // `NavigationEnd`; este efecto lo cambia por el nombre de la técnica cuando
  // llega y lo vuelve a poner si se cambia de pestaña.
  private readonly navigated = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
  );

  /**
   * Vuelve a pedir solo lo que falló. El botón desaparece al reintentar, así que el foco
   * pasa al panel en lugar de caer al inicio de la página.
   */
  protected retry(): void {
    this.panel()?.nativeElement.focus();
    if (this.resource.error()) this.resource.reload();
    if (this.instruments.error()) this.instruments.reload();
    if (this.session.loadFailed()) void this.session.load();
  }

  // ---------- Archivar ----------

  /**
   * La técnica que se archivó en esta visita (Resuelto 21 de `dataiq/docs/checklist-frontend.md`): el
   * detalle se queda con lo que ya tenía cargado, dice que está archivada y deja de ofrecer editarla,
   * archivarla y abrirla en los módulos. No hay lista de archivadas: al volver a cargar, la técnica
   * ya no existe para la API.
   */
  private readonly archivedId = signal<string | null>(null);
  protected readonly archivedTechniqueId = this.archivedId.asReadonly();
  protected readonly archived = computed(
    () => this.archivedId() !== null && this.archivedId() === this.techniqueId(),
  );
  private readonly archivedNotice = viewChild<ElementRef<HTMLElement>>('archivedNotice');

  protected onArchived(): void {
    this.archivedId.set(this.techniqueId() ?? null);
  }

  constructor() {
    effect(() => {
      this.navigated();
      const name = this.notFound() ? 'No encontrada' : this.technique()?.name;
      if (name) this.title.setTitle(`${name} · ${APP_NAME}`);
    });
    // El aviso de «Técnica archivada» recibe el foco al aparecer: el botón que se tocó ya no está
    effect(() => this.archivedNotice()?.nativeElement.focus());
  }
}
